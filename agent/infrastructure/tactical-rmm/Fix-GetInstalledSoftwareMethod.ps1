############################
# Fix GetInstalledSoftware Method
############################

function Fix-GetInstalledSoftwareMethod {
    Write-Host "Fixing GetInstalledSoftware method implementation..." -ForegroundColor Yellow
    
    # Find the agent_windows.go file
    $agentWindowsGoFile = "agent\agent_windows.go"
    $rpcGoFile = "agent\rpc.go"
    
    # Check if files exist
    if (-not (Test-Path $agentWindowsGoFile)) {
        Write-Host "ERROR: Cannot find $agentWindowsGoFile. Cannot fix GetInstalledSoftware method." -ForegroundColor Red
        return $false
    }
    
    if (-not (Test-Path $rpcGoFile)) {
        Write-Host "ERROR: Cannot find $rpcGoFile. Cannot fix GetInstalledSoftware method." -ForegroundColor Red
        return $false
    }
    
    # Read the content of agent_windows.go
    $agentWindowsContent = Get-Content $agentWindowsGoFile -Raw
    
    # Define the Software struct outside the method to avoid syntax errors
    $softwareStructDefinition = @"
// Software represents an installed software package
type Software struct {
    Name        string
    Version     string
    Publisher   string
    InstallDate string
    Size        string
    Source      string
}
"@

    # Define the correct implementation of GetInstalledSoftware method
    $correctImplementation = @"
// GetInstalledSoftware returns a list of installed software on Windows
func (a *Agent) GetInstalledSoftware() ([]Software, error) {
    var software []Software
    
    // Use PowerShell to get installed software
    cmd := exec.Command("powershell", "-Command", "Get-ItemProperty HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\* | Select-Object DisplayName, DisplayVersion, Publisher, InstallDate | ConvertTo-Json")
    output, err := cmd.Output()
    if err != nil {
        return software, err
    }
    
    // Parse the JSON output
    var results []map[string]interface{}
    err = json.Unmarshal(output, &results)
    if err != nil {
        return software, err
    }
    
    // Convert to Software struct
    for _, result := range results {
        if result["DisplayName"] != nil {
            sw := Software{
                Name:        fmt.Sprintf("%v", result["DisplayName"]),
                Version:     fmt.Sprintf("%v", result["DisplayVersion"]),
                Publisher:   fmt.Sprintf("%v", result["Publisher"]),
                InstallDate: fmt.Sprintf("%v", result["InstallDate"]),
                Source:      "Windows Registry",
            }
            software = append(software, sw)
        }
    }
    
    return software, nil
}
"@
    
    # Add necessary imports
    $importsToAdd = @(
        "encoding/json",
        "fmt",
        "os/exec"
    )
    
    # Check if imports are already present
    foreach ($importPackage in $importsToAdd) {
        if (-not ($agentWindowsContent -match "import\s+\(.*?$importPackage.*?\)" -or $agentWindowsContent -match "import\s+`"$importPackage`"")) {
            Write-Host "Adding import for $importPackage" -ForegroundColor Yellow
            
            # Find the import block or add one if it doesn't exist
            if ($agentWindowsContent -match "import\s+\(") {
                # Add to existing import block
                $agentWindowsContent = $agentWindowsContent -replace "import\s+\(", "import (`n`t`"$importPackage`""
            } else {
                # Add new import block after package declaration
                $agentWindowsContent = $agentWindowsContent -replace "package\s+\w+", "`$0`n`nimport (`n`t`"$importPackage`"`n)"
            }
        }
    }
    
    # Check if the Software struct already exists
    if (-not ($agentWindowsContent -match "type\s+Software\s+struct")) {
        Write-Host "Adding Software struct definition..." -ForegroundColor Yellow
        
        # Add the struct definition after the package and imports
        if ($agentWindowsContent -match "import\s+\([^)]+\)") {
            $agentWindowsContent = $agentWindowsContent -replace "import\s+\([^)]+\)", "`$0`n`n$softwareStructDefinition"
        } else {
            # If no import block, add after package declaration
            $agentWindowsContent = $agentWindowsContent -replace "package\s+\w+", "`$0`n`n$softwareStructDefinition"
        }
    } else {
        Write-Host "Software struct already exists. Skipping definition..." -ForegroundColor Yellow
    }
    
    # Check if the method already exists
    if ($agentWindowsContent -match "func \(a \*Agent\) GetInstalledSoftware\(\)") {
        Write-Host "Found existing GetInstalledSoftware method. Replacing with correct implementation..." -ForegroundColor Yellow
        
        # Replace the existing method with the correct implementation
        $pattern = "func \(a \*Agent\) GetInstalledSoftware\(\)[\s\S]*?^}"
        $agentWindowsContent = $agentWindowsContent -replace $pattern, $correctImplementation
    } else {
        Write-Host "GetInstalledSoftware method not found. Adding it to the file..." -ForegroundColor Yellow
        
        # Add the method at the end of the file
        $agentWindowsContent += "`n`n$correctImplementation"
    }
    
    # Write the updated content back to agent_windows.go
    Set-Content -Path $agentWindowsGoFile -Value $agentWindowsContent
    
    # Now fix the rpc.go file to properly call the method
    $rpcContent = Get-Content $rpcGoFile -Raw
    
    # Replace any direct calls to GetInstalledSoftware to handle the error return value
    $rpcContent = $rpcContent -replace "(\w+)\s*=\s*a\.GetInstalledSoftware\(\)", "$1, _ = a.GetInstalledSoftware()"
    $rpcContent = $rpcContent -replace "software\s*=\s*a\.GetInstalledSoftware\(\)", "software, _ = a.GetInstalledSoftware()"
    $rpcContent = $rpcContent -replace "win64api\.GetInstalledSoftware\(\)", "a.GetInstalledSoftware()"
    
    # Write the modified content back to the file
    Set-Content -Path $rpcGoFile -Value $rpcContent
    
    Write-Host "GetInstalledSoftware method fixed in agent_windows.go and rpc.go" -ForegroundColor Green
    Write-Host "The method now uses PowerShell to query the Windows Registry for installed software" -ForegroundColor Green
    Write-Host "Added necessary imports: encoding/json, fmt, os/exec" -ForegroundColor Green
    
    return $true
}
