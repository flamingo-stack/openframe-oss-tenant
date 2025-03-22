############################
# Simplified Build for Windows ARM64
############################

function Skip-GetInstalledSoftware {
    Write-Host "Skipping GetInstalledSoftware method patching to simplify build..." -ForegroundColor Yellow
    
    # Find the agent_windows.go file
    $agentWindowsGoFile = "agent\agent_windows.go"
    $rpcGoFile = "agent\rpc.go"
    
    # Check if files exist but don't modify them
    if (-not (Test-Path $agentWindowsGoFile)) {
        Write-Host "INFO: Cannot find $agentWindowsGoFile. Continuing with simplified build." -ForegroundColor Yellow
    } else {
        Write-Host "INFO: Found $agentWindowsGoFile. Continuing with simplified build without modifications." -ForegroundColor Yellow
    }
    
    if (-not (Test-Path $rpcGoFile)) {
        Write-Host "INFO: Cannot find $rpcGoFile. Continuing with simplified build." -ForegroundColor Yellow
    } else {
        Write-Host "INFO: Found $rpcGoFile. Continuing with simplified build without modifications." -ForegroundColor Yellow
    }
    
    # Add a note about the error we're avoiding
    Write-Host "Avoiding compilation error: 'agent\agent_windows.go:655:2: syntax error: unexpected comma, expected }'" -ForegroundColor Cyan
    Write-Host "This simplified approach skips modifying Go files that were causing syntax errors." -ForegroundColor Cyan
    
    Write-Host "Simplified build approach: Skipping GetInstalledSoftware method patching" -ForegroundColor Green
    return $true
}
