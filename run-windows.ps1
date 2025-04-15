# OpenFrame Installation Script
# This script checks for and installs the required components for OpenFrame

# Function to check if running as administrator
function Test-Administrator {
    $currentUser = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    $currentUser.IsInRole([Security.Principal.WindowsBuiltinRole]::Administrator)
}

# Function to reliably set up Loopback adapter with the required IP
function Set-KindLoopbackAdapter {
    Write-Host "Checking and configuring network for Kind cluster..." -ForegroundColor Cyan

    try {
        # Direct approach - add IP to existing adapter
        # Find a suitable network adapter that's up
        $adapter = Get-NetAdapter | Where-Object { $_.Status -eq "Up" } | Select-Object -First 1

        if (-not $adapter) {
            Write-Host "ERROR: Could not find any active network adapter" -ForegroundColor Red
            return $false
        }

        # Check if the IP already exists
        $existingIP = Get-NetIPAddress -IPAddress "192.168.100.100" -ErrorAction SilentlyContinue

        if ($existingIP) {
            Write-Host "Kind cluster IP (192.168.100.100) is already configured." -ForegroundColor Green
            return $true
        }

        Write-Host "Adding IP address 192.168.100.100 to adapter $($adapter.Name)..." -ForegroundColor Yellow

        # Try multiple methods to add the IP
        $success = $false

        # Method 1: New-NetIPAddress PowerShell cmdlet
        try {
            $result = New-NetIPAddress -IPAddress "192.168.100.100" -PrefixLength 24 -InterfaceIndex $adapter.ifIndex
            if ($result) {
                $success = $true
                Write-Host "Successfully configured network using New-NetIPAddress." -ForegroundColor Green
            }
        } catch {
            Write-Host "New-NetIPAddress method failed: $_" -ForegroundColor Yellow
        }

        # Method 2: Try using netsh if PowerShell method failed
        if (-not $success) {
            try {
                Write-Host "Trying netsh method..." -ForegroundColor Yellow
                $netshResult = netsh interface ipv4 add address name="$($adapter.Name)" addr=192.168.100.100 mask=255.255.255.0

                # Verify IP was added
                Start-Sleep -Seconds 2
                $verifyIP = Get-NetIPAddress -IPAddress "192.168.100.100" -ErrorAction SilentlyContinue
                if ($verifyIP) {
                    $success = $true
                    Write-Host "Successfully configured network using netsh." -ForegroundColor Green
                }
            } catch {
                Write-Host "Netsh method failed: $_" -ForegroundColor Yellow
            }
        }

        # Method 3: Create a new loopback interface if both methods failed
        if (-not $success) {
            try {
                Write-Host "Creating a dedicated loopback interface..." -ForegroundColor Yellow

                # Create a new network interface using New-LoopbackAdapter from NetAdapter module
                if (Get-Command New-LoopbackAdapter -ErrorAction SilentlyContinue) {
                    $newAdapter = New-LoopbackAdapter -Name "KindLoopback" -ErrorAction Stop

                    # Configure the IP on the new adapter
                    New-NetIPAddress -InterfaceAlias "KindLoopback" -IPAddress "192.168.100.100" -PrefixLength 24 | Out-Null
                    $success = $true
                    Write-Host "Successfully created and configured loopback adapter." -ForegroundColor Green
                }
            } catch {
                Write-Host "Loopback adapter creation failed: $_" -ForegroundColor Yellow
            }
        }

        # As a last resort, try using PowerShell's Route Add command
        if (-not $success) {
            try {
                Write-Host "Adding static route as last resort..." -ForegroundColor Yellow

                # Add a persistent route
                $routeResult = route add 192.168.100.100 mask 255.255.255.255 $adapter.ifIndex -p

                if ($LASTEXITCODE -eq 0) {
                    $success = $true
                    Write-Host "Successfully added static route for 192.168.100.100." -ForegroundColor Green
                }
            } catch {
                Write-Host "Route add method failed: $_" -ForegroundColor Yellow
            }
        }

        # Final verification
        $finalCheck = Get-NetIPAddress -IPAddress "192.168.100.100" -ErrorAction SilentlyContinue

        if ($finalCheck -or $success) {
            Write-Host "IP 192.168.100.100 is now available for Kind cluster." -ForegroundColor Green
            return $true
        } else {
            Write-Host "Could not configure IP address through any method." -ForegroundColor Red
            Write-Host "Trying one more approach - adding a host entry..." -ForegroundColor Yellow

            # Add a hosts file entry as a fallback
            try {
                $hostsFile = "$env:windir\System32\drivers\etc\hosts"
                $hostsContent = Get-Content $hostsFile

                if (-not ($hostsContent -match "192.168.100.100")) {
                    Add-Content -Path $hostsFile -Value "`n192.168.100.100 kind.local # Added by Kind setup script" -Force
                    Write-Host "Added hosts file entry for 192.168.100.100 -> kind.local" -ForegroundColor Green
                    return $true  # We'll consider this sufficient for our purposes
                } else {
                    Write-Host "Hosts file already has an entry for 192.168.100.100" -ForegroundColor Green
                    return $true
                }
            } catch {
                Write-Host "Failed to modify hosts file: $_" -ForegroundColor Red
                return $false
            }
        }
    } catch {
        Write-Host "Error configuring network: $_" -ForegroundColor Red
        Write-Host "Stack Trace: $($_.ScriptStackTrace)" -ForegroundColor Red
        return $false
    }
}

# Function to cleanup network configuration
function Remove-KindNetwork {
    Write-Host "Removing Kind cluster network configuration..." -ForegroundColor Cyan

    try {
        # Remove the IP address if it exists
        $existingIP = Get-NetIPAddress -IPAddress "192.168.100.100" -ErrorAction SilentlyContinue

        if ($existingIP) {
            Remove-NetIPAddress -IPAddress "192.168.100.100" -Confirm:$false
            Write-Host "Removed Kind cluster IP configuration." -ForegroundColor Green
        }

        # Remove any static routes for this IP
        try {
            route delete 192.168.100.100
        } catch {
            # Ignore errors from route deletion
        }

        # Remove hosts file entry if it exists
        try {
            $hostsFile = "$env:windir\System32\drivers\etc\hosts"
            $hostsContent = Get-Content $hostsFile

            if ($hostsContent -match "192.168.100.100") {
                $newContent = $hostsContent | Where-Object { $_ -notmatch "192.168.100.100" }
                Set-Content -Path $hostsFile -Value $newContent -Force
                Write-Host "Removed hosts file entry for 192.168.100.100" -ForegroundColor Green
            }
        } catch {
            Write-Host "Could not update hosts file: $_" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "Error removing network configuration: $_" -ForegroundColor Yellow
    }
}

# Function to perform a complete Docker restart
function Restart-DockerDesktop {
    Write-Host "Restarting Docker Desktop..." -ForegroundColor Cyan

    # First, try to gracefully stop Docker Desktop
    $dockerProcess = Get-Process "Docker Desktop" -ErrorAction SilentlyContinue
    if ($dockerProcess) {
        Write-Host "Stopping Docker Desktop gracefully..." -ForegroundColor Yellow
        $dockerProcess | Stop-Process -Force
        Start-Sleep -Seconds 5
    }

    # Force kill any remaining Docker processes
    Get-Process | Where-Object {$_.Name -like "*docker*"} | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 3

    # Start Docker Desktop again
    Write-Host "Starting Docker Desktop..." -ForegroundColor Yellow
    Start-Process 'C:\Program Files\Docker\Docker\Docker Desktop.exe'

    # Wait for Docker to start
    Write-Host "Waiting for Docker to initialize (this may take several minutes)..." -ForegroundColor Yellow
    $retryCount = 0
    $maxRetries = 12 # 2 minutes
    $dockerRunning = $false

    while ($retryCount -lt $maxRetries -and -not $dockerRunning) {
        $retryCount++
        Write-Host "Checking if Docker is ready... (Attempt $retryCount of $maxRetries)" -ForegroundColor Yellow
        Start-Sleep -Seconds 10

        try {
            $result = docker info 2>&1
            if ($LASTEXITCODE -eq 0) {
                $dockerRunning = $true
                Write-Host "Docker is now running properly." -ForegroundColor Green
            }
        } catch {
            # Continue waiting
        }
    }

    if (-not $dockerRunning) {
        Write-Host "WARNING: Docker may not be running properly after restart attempts." -ForegroundColor Red
        return $false
    }

    return $true
}

# Function to reset Kubernetes in Docker Desktop
function Reset-KubernetesInDocker {
    Write-Host "Resetting Kubernetes in Docker Desktop..." -ForegroundColor Cyan

    try {
        # First check if settings.json exists
        $settingsPath = "$env:USERPROFILE\AppData\Roaming\Docker\settings.json"
        if (-not (Test-Path $settingsPath)) {
            Write-Host "Docker settings file not found. Docker Desktop might not be installed properly." -ForegroundColor Red
            return $false
        }

        # Make a backup of the settings
        $backupPath = "$settingsPath.backup"
        Copy-Item -Path $settingsPath -Destination $backupPath -Force
        Write-Host "Created backup of Docker settings at: $backupPath" -ForegroundColor Green

        # Read the settings file
        $settingsJson = Get-Content $settingsPath -Raw
        $settings = ConvertFrom-Json $settingsJson

        # Disable Kubernetes
        Write-Host "Disabling Kubernetes in Docker settings..." -ForegroundColor Yellow

        # Create objects if they don't exist with proper structure
        if (-not (Get-Member -InputObject $settings -Name "kubernetes" -MemberType Properties)) {
            Add-Member -InputObject $settings -MemberType NoteProperty -Name "kubernetes" -Value (New-Object PSObject)
        }

        if (-not (Get-Member -InputObject $settings.kubernetes -Name "enabled" -MemberType Properties)) {
            Add-Member -InputObject $settings.kubernetes -MemberType NoteProperty -Name "enabled" -Value $false
        } else {
            $settings.kubernetes.enabled = $false
        }

        # Also check extensions
        if (-not (Get-Member -InputObject $settings -Name "extensions" -MemberType Properties)) {
            Add-Member -InputObject $settings -MemberType NoteProperty -Name "extensions" -Value (New-Object PSObject)
        }

        if (-not (Get-Member -InputObject $settings.extensions -Name "kubernetes" -MemberType Properties)) {
            Add-Member -InputObject $settings.extensions -MemberType NoteProperty -Name "kubernetes" -Value (New-Object PSObject)
        }

        if (-not (Get-Member -InputObject $settings.extensions.kubernetes -Name "enabled" -MemberType Properties)) {
            Add-Member -InputObject $settings.extensions.kubernetes -MemberType NoteProperty -Name "enabled" -Value $false
        } else {
            $settings.extensions.kubernetes.enabled = $false
        }

        # Save the modified settings
        $settings | ConvertTo-Json -Depth 10 | Set-Content $settingsPath

        # Restart Docker to apply changes
        Write-Host "Restarting Docker to apply changes..." -ForegroundColor Yellow
        Restart-DockerDesktop

        # Clean Kubernetes data
        Write-Host "Cleaning Kubernetes data..." -ForegroundColor Yellow
        $kubePaths = @(
            "$env:USERPROFILE\.kube",
            "$env:ProgramData\DockerDesktop\kubernetes",
            "$env:USERPROFILE\AppData\Local\Docker\kubernetes",
            "$env:USERPROFILE\AppData\Roaming\Docker\kubernetes"
        )

        foreach ($path in $kubePaths) {
            if (Test-Path $path) {
                try {
                    # Create a backup with timestamp
                    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
                    $backupDir = "$path.backup_$timestamp"
                    Copy-Item -Path $path -Destination $backupDir -Recurse -Force -ErrorAction SilentlyContinue

                    # Try to clean the directory
                    Remove-Item -Path "$path\*" -Recurse -Force -ErrorAction SilentlyContinue
                    Write-Host "Cleaned Kubernetes data at: $path" -ForegroundColor Green
                } catch {
                    Write-Host "Could not fully clean $path. Some files may be in use." -ForegroundColor Yellow
                }
            }
        }

        # Re-enable Kubernetes in settings
        Write-Host "Re-enabling Kubernetes in Docker settings..." -ForegroundColor Yellow
        $settings = Get-Content $settingsPath -Raw | ConvertFrom-Json

        $settings.kubernetes.enabled = $true
        if (Get-Member -InputObject $settings.extensions -Name "kubernetes" -MemberType Properties) {
            $settings.extensions.kubernetes.enabled = $true
        }

        # Save the settings again
        $settings | ConvertTo-Json -Depth 10 | Set-Content $settingsPath

        # Restart Docker again
        Write-Host "Restarting Docker again to enable Kubernetes..." -ForegroundColor Yellow
        Restart-DockerDesktop

        # Wait for Kubernetes to initialize
        Write-Host "Waiting for Kubernetes to initialize (this may take several minutes)..." -ForegroundColor Yellow

        Start-Sleep -Seconds 30

        # Verify Kubernetes is running
        Write-Host "Verifying Kubernetes cluster..." -ForegroundColor Yellow
        $retryCount = 0
        $maxRetries = 10
        $k8sRunning = $false

        while ($retryCount -lt $maxRetries -and -not $k8sRunning) {
            $retryCount++
            Write-Host "Checking Kubernetes status... (Attempt $retryCount of $maxRetries)" -ForegroundColor Yellow

            try {
                $job = Start-Job -ScriptBlock { kubectl cluster-info }
                $completed = Wait-Job $job -Timeout 15

                if ($completed) {
                    $result = Receive-Job $job
                    Remove-Job $job

                    if ($result -match "Kubernetes control plane") {
                        $k8sRunning = $true
                        Write-Host "Kubernetes is now running properly!" -ForegroundColor Green
                    }
                } else {
                    Stop-Job $job
                    Remove-Job $job -Force
                }
            } catch {
                # Continue with next attempt
            }

            if (-not $k8sRunning) {
                Start-Sleep -Seconds 15
            }
        }

        if ($k8sRunning) {
            # Set up .kube/config
            Write-Host "Setting up kubectl configuration..." -ForegroundColor Yellow
            New-Item -ItemType Directory -Path "$env:USERPROFILE\.kube" -Force | Out-Null

            $dockerK8sConfig = "$env:USERPROFILE\AppData\Roaming\Docker\kubernetes\config"
            if (Test-Path $dockerK8sConfig) {
                Copy-Item -Path $dockerK8sConfig -Destination "$env:USERPROFILE\.kube\config" -Force
                Write-Host "Copied Kubernetes config to user profile." -ForegroundColor Green
            }

            return $true
        } else {
            Write-Host "Kubernetes did not start properly after reset." -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "Error during Kubernetes reset: $_" -ForegroundColor Red
        Write-Host "Stack Trace: $($_.ScriptStackTrace)" -ForegroundColor Red
        return $false
    }
}

# Function to check Docker status
function Test-DockerStatus {
    Write-Host "Checking Docker status..." -ForegroundColor Cyan

    # Check if Docker Desktop is installed
    $dockerDesktop = Get-Process 'Docker Desktop' -ErrorAction SilentlyContinue
    if (-not $dockerDesktop) {
        Write-Host "Docker Desktop is not running." -ForegroundColor Yellow
        Write-Host "Starting Docker Desktop..." -ForegroundColor Yellow
        Start-Process 'C:\Program Files\Docker\Docker\Docker Desktop.exe'
        Write-Host "Waiting for Docker to start (this may take a few minutes)..." -ForegroundColor Yellow
        Start-Sleep -Seconds 30
    }

    # Check if Docker engine is responsive
    $retryCount = 0
    $maxRetries = 6
    $dockerRunning = $false

    while ($retryCount -lt $maxRetries -and -not $dockerRunning) {
        try {
            $result = docker info 2>&1
            if ($LASTEXITCODE -eq 0) {
                $dockerRunning = $true
                Write-Host "Docker is running properly." -ForegroundColor Green
            }
        }
        catch {
            Write-Host "Waiting for Docker to be ready... (Attempt $($retryCount + 1)/$maxRetries)" -ForegroundColor Yellow
            Start-Sleep -Seconds 10
            $retryCount++
        }
    }

    if (-not $dockerRunning) {
        Write-Host "ERROR: Docker is not running properly after multiple attempts." -ForegroundColor Red
        Write-Host "Attempting to restart Docker Desktop..." -ForegroundColor Yellow

        if (Restart-DockerDesktop) {
            Write-Host "Docker restart successful! Checking status again..." -ForegroundColor Green
            $result = docker info 2>&1
            if ($LASTEXITCODE -eq 0) {
                $dockerRunning = $true
                Write-Host "Docker is now running properly after restart." -ForegroundColor Green
            } else {
                Write-Host "Docker is still not responding properly after restart." -ForegroundColor Red
                return $false
            }
        } else {
            Write-Host "Failed to restart Docker. Please try manually restarting Docker Desktop." -ForegroundColor Red
            return $false
        }
    }

    return $true
}

# Function to enable Kubernetes in Docker Desktop
function Enable-Kubernetes {
    Write-Host "Attempting to enable Kubernetes in Docker Desktop..." -ForegroundColor Cyan

    try {
        $settingsPath = "$env:USERPROFILE\AppData\Roaming\Docker\settings.json"

        # Read current settings
        $settings = Get-Content $settingsPath -ErrorAction Stop | ConvertFrom-Json

        # Check if we need to modify settings
        $settingsChanged = $false

        # Create kubernetes object if it doesn't exist
        if (-not $settings.PSObject.Properties['kubernetes']) {
            $settings | Add-Member -Type NoteProperty -Name 'kubernetes' -Value @{}
        }

        # Enable Kubernetes
        if (-not ($settings.kubernetes.PSObject.Properties['enabled'] -and $settings.kubernetes.enabled)) {
            $settings.kubernetes | Add-Member -Type NoteProperty -Name 'enabled' -Value $true -Force
            $settingsChanged = $true
        }

        # Create extensions object if it doesn't exist
        if (-not $settings.PSObject.Properties['extensions']) {
            $settings | Add-Member -Type NoteProperty -Name 'extensions' -Value @{}
        }

        # Create kubernetes object in extensions if it doesn't exist
        if (-not $settings.extensions.PSObject.Properties['kubernetes']) {
            $settings.extensions | Add-Member -Type NoteProperty -Name 'kubernetes' -Value @{}
        }

        # Enable Kubernetes in extensions
        if (-not ($settings.extensions.kubernetes.PSObject.Properties['enabled'] -and $settings.extensions.kubernetes.enabled)) {
            $settings.extensions.kubernetes | Add-Member -Type NoteProperty -Name 'enabled' -Value $true -Force
            $settingsChanged = $true
        }

        if ($settingsChanged) {
            Write-Host "Updating Docker Desktop settings..." -ForegroundColor Yellow

            # Create backup of current settings
            $backupPath = "$settingsPath.backup"
            Copy-Item -Path $settingsPath -Destination $backupPath -Force
            Write-Host "Created backup of settings at: $backupPath" -ForegroundColor Cyan

            # Save modified settings
            $settings | ConvertTo-Json -Depth 10 | Set-Content $settingsPath

            # Restart Docker Desktop
            Write-Host "Restarting Docker Desktop to apply Kubernetes settings..." -ForegroundColor Yellow
            Restart-DockerDesktop

            # Wait for Kubernetes to initialize
            Write-Host "Waiting for Kubernetes to initialize..." -ForegroundColor Yellow
            Start-Sleep -Seconds 30

            return $true
        } else {
            Write-Host "Kubernetes is already enabled in settings." -ForegroundColor Green
            return $true
        }
    } catch {
        Write-Host "Error modifying Docker Desktop settings: $_" -ForegroundColor Red
        Write-Host "Stack Trace: $($_.ScriptStackTrace)" -ForegroundColor Red
        return $false
    }
}

# Function to check Kubernetes status
function Test-KubernetesStatus {
    Write-Host "Checking Kubernetes status..." -ForegroundColor Cyan

    # Check if kubectl is available
    if (-not (Get-Command kubectl -ErrorAction SilentlyContinue)) {
        Write-Host "ERROR: kubectl is not installed." -ForegroundColor Red
        return $false
    }

    # First check if Kubernetes is enabled in Docker Desktop
    try {
        $settingsPath = "$env:USERPROFILE\AppData\Roaming\Docker\settings.json"
        if (Test-Path $settingsPath) {
            $dockerSettings = Get-Content $settingsPath -ErrorAction Stop | ConvertFrom-Json
            $k8sEnabled = $false

            if ($dockerSettings.PSObject.Properties['kubernetes'] -and
                    $dockerSettings.kubernetes.PSObject.Properties['enabled']) {
                $k8sEnabled = $dockerSettings.kubernetes.enabled
            }

            if (-not $k8sEnabled) {
                Write-Host "Kubernetes is not enabled in Docker Desktop" -ForegroundColor Yellow

                # Try to enable Kubernetes
                if (-not (Enable-Kubernetes)) {
                    Write-Host "Failed to enable Kubernetes automatically." -ForegroundColor Red
                    Write-Host "Please enable Kubernetes manually in Docker Desktop settings:" -ForegroundColor Yellow
                    Write-Host "1. Open Docker Desktop" -ForegroundColor Yellow
                    Write-Host "2. Go to Settings > Kubernetes" -ForegroundColor Yellow
                    Write-Host "3. Check 'Enable Kubernetes'" -ForegroundColor Yellow
                    Write-Host "4. Click 'Apply & Restart'" -ForegroundColor Yellow
                    return $false
                }
            }
        }
    } catch {
        Write-Host "Could not check Docker Desktop settings: $_" -ForegroundColor Yellow
        Write-Host "Continuing with Kubernetes checks..." -ForegroundColor Yellow
    }

    # Check if Kubernetes is running
    $retryCount = 0
    $maxRetries = 6  # Increased retries for initial startup
    $k8sRunning = $false

    while ($retryCount -lt $maxRetries -and -not $k8sRunning) {
        try {
            Write-Host ("Checking Kubernetes connection... (Attempt " + ($retryCount + 1) + " of $maxRetries)") -ForegroundColor Yellow

            # Try to get cluster info with a timeout
            $job = Start-Job -ScriptBlock { kubectl cluster-info }
            $completed = Wait-Job $job -Timeout 10

            if ($null -eq $completed) {
                Stop-Job $job
                Remove-Job $job -Force
                Write-Host "Timeout while checking Kubernetes. Still starting..." -ForegroundColor Yellow
                Start-Sleep -Seconds 10
            } else {
                $result = Receive-Job $job
                Remove-Job $job

                if ($result -match "Kubernetes control plane") {
                    $k8sRunning = $true
                    Write-Host "Kubernetes is running properly:" -ForegroundColor Green
                    Write-Host $result -ForegroundColor Green

                    # Show node status with timeout
                    Write-Host "`nChecking Kubernetes nodes status..." -ForegroundColor Cyan
                    $nodeJob = Start-Job -ScriptBlock { kubectl get nodes }
                    $nodeCompleted = Wait-Job $nodeJob -Timeout 5

                    if ($nodeCompleted) {
                        Receive-Job $nodeJob | ForEach-Object {
                            Write-Host $_ -ForegroundColor Green
                        }
                    } else {
                        Write-Host "Timeout while getting node status, but Kubernetes is running." -ForegroundColor Yellow
                    }
                    Remove-Job $nodeJob -Force
                }
            }
        }
        catch {
            Write-Host "Error checking Kubernetes: $_" -ForegroundColor Red
        }

        if (-not $k8sRunning) {
            $retryCount++
            if ($retryCount -lt $maxRetries) {
                Write-Host "Waiting for Kubernetes to be ready... (Attempt $retryCount of $maxRetries)" -ForegroundColor Yellow
                Start-Sleep -Seconds 10
            }
        }
    }

    if (-not $k8sRunning) {
        Write-Host "`nERROR: Kubernetes is not running properly after $maxRetries attempts." -ForegroundColor Red
        Write-Host "Attempting to reset Kubernetes in Docker Desktop..." -ForegroundColor Yellow

        if (Reset-KubernetesInDocker) {
            Write-Host "Kubernetes reset successful! Checking status again..." -ForegroundColor Green

            # Check one more time
            $job = Start-Job -ScriptBlock { kubectl cluster-info }
            $completed = Wait-Job $job -Timeout 15
            if ($completed) {
                $result = Receive-Job $job
                Remove-Job $job

                if ($result -match "Kubernetes control plane") {
                    $k8sRunning = $true
                    Write-Host "Kubernetes is now running properly after reset!" -ForegroundColor Green
                }
            } else {
                Stop-Job $job
                Remove-Job $job -Force
            }
        } else {
            Write-Host "Failed to reset Kubernetes. Please try manual reset in Docker Desktop." -ForegroundColor Red
        }
    }

    return $k8sRunning
}

# Add this to your existing cleanup code
function Cleanup-Environment {
    Write-Host "Cleaning up environment..." -ForegroundColor Cyan

    # Remove Kind cluster if it exists
    try {
        $kindCluster = $(kind get clusters 2>&1)
        if ($LASTEXITCODE -eq 0 -and $kindCluster -contains "kind") {
            Write-Host "Removing existing Kind cluster..." -ForegroundColor Yellow
            kind delete cluster
            Remove-Item -Path "/tmp/control-plane", "/tmp/worker1", "/tmp/worker2", "/tmp/worker3" -Recurse -Force -ErrorAction SilentlyContinue
        }
    } catch {
        Write-Host "Error when checking for Kind clusters: $_" -ForegroundColor Yellow
    }

    # Remove network configurations
    Remove-KindNetwork
}

# Function to configure Kind network using a Loopback Adapter
function Set-KindNetwork {
    Write-Host "Checking and configuring Loopback Adapter for Kind cluster..." -ForegroundColor Cyan

    try {
        # First check if the dedicated loopback adapter already exists
        $loopbackAdapter = Get-NetAdapter | Where-Object { $_.Name -like "*Loopback*" -or $_.Description -like "*Loopback*" } | Select-Object -First 1

        # Create a new loopback adapter if one doesn't exist
        if (-not $loopbackAdapter) {
            Write-Host "Creating new Loopback Adapter..." -ForegroundColor Yellow

            # Use Device Manager's Add Legacy Hardware wizard to add Microsoft KM-TEST Loopback Adapter
            # This is an alternative approach that doesn't require devcon.exe

            Write-Host "Creating Microsoft KM-TEST Loopback Adapter using PowerShell..." -ForegroundColor Yellow

            # Add the Microsoft KM-TEST Loopback Adapter using PowerShell commands
            Add-WindowsCapability -Online -Name "Networking.LoopbackAdapter~~~~0.0.1.0"

            # Wait for the adapter to be created
            Start-Sleep -Seconds 5

            # Get the newly created adapter
            $loopbackAdapter = Get-NetAdapter | Where-Object { $_.Name -like "*Loopback*" -or $_.Description -like "*Microsoft KM-TEST Loopback Adapter*" } | Select-Object -First 1

            if (-not $loopbackAdapter) {
                # Alternative method using netcfg if Add-WindowsCapability failed
                Write-Host "Trying alternative method with netcfg..." -ForegroundColor Yellow

                $netcfgResult = netcfg -v -l "$env:windir\inf\netloop.inf" -c p -i *MSLOOP

                # Wait for the adapter to be created
                Start-Sleep -Seconds 5

                # Get the newly created adapter
                $loopbackAdapter = Get-NetAdapter | Where-Object { $_.Name -like "*Loopback*" -or $_.Description -like "*Loopback*" } | Select-Object -First 1
            }

            if (-not $loopbackAdapter) {
                Write-Host "ERROR: Failed to create Loopback Adapter" -ForegroundColor Red
                return $false
            }

            # Rename the adapter for clarity
            try {
                Rename-NetAdapter -Name $loopbackAdapter.Name -NewName "Kind-Loopback"
                $loopbackAdapter = Get-NetAdapter -Name "Kind-Loopback" -ErrorAction SilentlyContinue
                if (-not $loopbackAdapter) {
                    $loopbackAdapter = Get-NetAdapter | Where-Object { $_.Name -like "*Loopback*" -or $_.Description -like "*Loopback*" } | Select-Object -First 1
                }
            } catch {
                Write-Host "Warning: Could not rename adapter, but will continue with: $($loopbackAdapter.Name)" -ForegroundColor Yellow
            }

            Write-Host "Successfully created Loopback Adapter: $($loopbackAdapter.Name)" -ForegroundColor Green
        } else {
            Write-Host "Found existing Loopback Adapter: $($loopbackAdapter.Name)" -ForegroundColor Green
        }

        # Make sure the adapter is enabled
        if ($loopbackAdapter.Status -ne "Up") {
            Write-Host "Enabling Loopback Adapter..." -ForegroundColor Yellow
            Enable-NetAdapter -Name $loopbackAdapter.Name -Confirm:$false
            Start-Sleep -Seconds 2
            $loopbackAdapter = Get-NetAdapter -Name $loopbackAdapter.Name
        }

        # Check if the IP already exists on the loopback adapter
        $existingIP = Get-NetIPAddress -InterfaceIndex $loopbackAdapter.ifIndex -IPAddress "192.168.100.100" -ErrorAction SilentlyContinue

        if ($existingIP) {
            Write-Host "Kind cluster IP (192.168.100.100) is already configured on the Loopback Adapter." -ForegroundColor Green
            return $true
        }

        # Configure the IP address on the loopback adapter using netsh (more reliable than New-NetIPAddress)
        Write-Host "Adding IP address 192.168.100.100 to Loopback Adapter using netsh..." -ForegroundColor Yellow

        try {
            # Using netsh command instead of New-NetIPAddress
            $netshResult = netsh interface ipv4 add address name="$($loopbackAdapter.Name)" addr=192.168.100.100 mask=255.255.255.0

            # Verify IP was added
            Start-Sleep -Seconds 2
            $verifyIP = Get-NetIPAddress -IPAddress "192.168.100.100" -ErrorAction SilentlyContinue

            if ($verifyIP) {
                Write-Host "Successfully configured IP address on Loopback Adapter." -ForegroundColor Green

                # Add a hosts file entry for convenience
                $hostsFile = "$env:windir\System32\drivers\etc\hosts"
                $hostsContent = Get-Content $hostsFile

                if (-not ($hostsContent -match "192.168.100.100")) {
                    Add-Content -Path $hostsFile -Value "`n192.168.100.100 kind.local # Added by Kind setup script" -Force
                    Write-Host "Added hosts file entry for 192.168.100.100 -> kind.local" -ForegroundColor Green
                }

                return $true
            } else {
                Write-Host "IP address not found after configuration. Netsh output: $netshResult" -ForegroundColor Red

                # Try one last alternative method - PowerShell cmdlet with different parameters
                Write-Host "Trying one last method..." -ForegroundColor Yellow
                try {
                    $null = New-NetIPAddress -IPAddress "192.168.100.100" -PrefixLength 24 -InterfaceAlias $loopbackAdapter.Name

                    # Verify again
                    Start-Sleep -Seconds 2
                    $finalVerifyIP = Get-NetIPAddress -IPAddress "192.168.100.100" -ErrorAction SilentlyContinue

                    if ($finalVerifyIP) {
                        Write-Host "Successfully configured IP address using alternative method." -ForegroundColor Green
                        return $true
                    }
                } catch {
                    Write-Host "Alternative method also failed: $_" -ForegroundColor Red
                }

                return $false
            }
        }
        catch {
            Write-Host "Error configuring IP address on Loopback Adapter: $_" -ForegroundColor Red
            return $false
        }
    }
    catch {
        Write-Host "Error in Set-KindNetwork: $_" -ForegroundColor Red
        Write-Host "Stack Trace: $($_.ScriptStackTrace)" -ForegroundColor Red
        return $false
    }
}

# Check if script is running as administrator, if not, restart as admin
if (-not (Test-Administrator)) {
    Write-Host "This script requires administrator privileges. Restarting as admin..." -ForegroundColor Yellow
    Start-Process powershell.exe -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs
    Exit
}

Write-Host "Starting OpenFrame installation process..." -ForegroundColor Green

# 1. Check/install Chocolatey
Write-Host "Checking for Chocolatey installation..." -ForegroundColor Cyan
if (-not (Get-Command choco -ErrorAction SilentlyContinue)) {
    Write-Host "Chocolatey not found. Installing Chocolatey..." -ForegroundColor Yellow
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

    # Refresh environment variables
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

    Write-Host "Chocolatey installed successfully!" -ForegroundColor Green
} else {
    Write-Host "Chocolatey is already installed." -ForegroundColor Green
}

# 2. Check/install Git CLI
Write-Host "Checking for Git installation..." -ForegroundColor Cyan
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "Git not found. Installing Git..." -ForegroundColor Yellow
    choco install git -y

    # Refresh environment variables
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

    Write-Host "Git installed successfully!" -ForegroundColor Green
} else {
    Write-Host "Git is already installed." -ForegroundColor Green
}

# Check Docker and Kubernetes status
if (-not (Test-DockerStatus)) {
    Write-Host "Docker has issues. Attempting to restart Docker..." -ForegroundColor Yellow
    if (-not (Restart-DockerDesktop)) {
        Write-Host "Failed to restart Docker. Please restart Docker Desktop manually and run the script again." -ForegroundColor Red
        Exit 1
    }
}

if (-not (Test-KubernetesStatus)) {
    Write-Host "Kubernetes has issues. Attempting to reset Kubernetes..." -ForegroundColor Yellow
    if (-not (Reset-KubernetesInDocker)) {
        Write-Host "Failed to reset Kubernetes. Please reset Kubernetes in Docker Desktop manually and run the script again." -ForegroundColor Red
        Exit 1
    }
}

# Configure network for Kind cluster
if (-not (Set-KindNetwork)) {
    Write-Host "Failed to configure IP for Kind cluster." -ForegroundColor Red
    Write-Host "Will attempt to continue with the installation..." -ForegroundColor Yellow
}

# 3. Handle repository
# Use the current directory where the script is running
$currentDir = Get-Location
$repoPath = $currentDir.Path

Write-Host "Working with repository at $repoPath..." -ForegroundColor Cyan

# Check if the current directory is a git repository
if (-not (Test-Path "$repoPath\.git")) {
    Write-Host "Current directory is not a Git repository." -ForegroundColor Yellow

    # Ask user if they want to clone the repo here or specify a different location
    $cloneHere = Read-Host "Do you want to clone the OpenFrame repository in the current directory? (Y/N)"

    if ($cloneHere -eq "Y" -or $cloneHere -eq "y") {
        # If directory is not empty, warn the user
        if ((Get-ChildItem -Path $repoPath | Measure-Object).Count -gt 0) {
            $forceClone = Read-Host "Warning: The current directory is not empty. Continue with cloning? (Y/N)"
            if (-not ($forceClone -eq "Y" -or $forceClone -eq "y")) {
                Write-Host "Operation cancelled by user." -ForegroundColor Red
                exit 1
            }
        }

        # Clone the repository to the current directory
        Write-Host "Cloning OpenFrame repository to current directory..." -ForegroundColor Yellow
        git clone https://github.com/openframe/openframe.git .

        if ($LASTEXITCODE -eq 0) {
            Write-Host "OpenFrame repository cloned successfully!" -ForegroundColor Green
        } else {
            Write-Host "Failed to clone the OpenFrame repository. Please check the URL and your internet connection." -ForegroundColor Red
            exit 1
        }
    } else {
        # Ask for custom path
        $customPath = Read-Host "Please enter the full path where you want to clone the repository"

        if (-not (Test-Path $customPath)) {
            $createDir = Read-Host "Directory does not exist. Create it? (Y/N)"
            if ($createDir -eq "Y" -or $createDir -eq "y") {
                New-Item -ItemType Directory -Path $customPath -Force | Out-Null
            } else {
                Write-Host "Operation cancelled by user." -ForegroundColor Red
                exit 1
            }
        }

        # Clone the repository to the specified directory
        Write-Host "Cloning OpenFrame repository to $customPath..." -ForegroundColor Yellow
        git clone https://github.com/openframe/openframe.git $customPath

        if ($LASTEXITCODE -eq 0) {
            Write-Host "OpenFrame repository cloned successfully!" -ForegroundColor Green
            $repoPath = $customPath
        } else {
            Write-Host "Failed to clone the OpenFrame repository. Please check the URL and your internet connection." -ForegroundColor Red
            exit 1
        }
    }
} else {
    Write-Host "Current directory is a Git repository." -ForegroundColor Green

    # Ask if user wants to pull latest changes
    $pullChanges = Read-Host "Do you want to pull the latest changes? (Y/N)"
    if ($pullChanges -eq "Y" -or $pullChanges -eq "y") {
        Write-Host "Pulling latest changes from the repository..." -ForegroundColor Cyan
        git pull

        if ($LASTEXITCODE -eq 0) {
            Write-Host "Successfully pulled latest changes." -ForegroundColor Green
        } else {
            Write-Host "Failed to pull changes. There might be conflicts or network issues." -ForegroundColor Yellow
        }
    }
}

# 4. Check/install Docker Desktop with WSL2
Write-Host "Checking for Docker Desktop installation..." -ForegroundColor Cyan
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "Docker Desktop not found. Installing Docker Desktop with WSL2..." -ForegroundColor Yellow

    # Make sure WSL2 is enabled
    Write-Host "Ensuring WSL2 is enabled..." -ForegroundColor Cyan
    dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
    dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart

    # Set WSL2 as default
    Write-Host "Setting WSL2 as default..." -ForegroundColor Cyan
    wsl --set-default-version 2

    # Install Docker Desktop
    choco install docker-desktop -y

    Write-Host "Docker Desktop installed successfully!" -ForegroundColor Green
    Write-Host "NOTE: You may need to restart your computer to complete the Docker installation." -ForegroundColor Yellow

    $restartChoice = Read-Host "Do you want to restart your computer now? (Y/N)"
    if ($restartChoice -eq "Y" -or $restartChoice -eq "y") {
        Restart-Computer -Force
        exit
    }
} else {
    Write-Host "Docker Desktop is already installed." -ForegroundColor Green
}

# 5. Find and run the run.sh script using Git Bash
Write-Host "Searching for run.sh in the repository..." -ForegroundColor Cyan
$gitBashPath = "C:\Program Files\Git\bin\bash.exe"

# Search for run.sh in the repository
$runShFiles = Get-ChildItem -Path $repoPath -Filter "run.sh" -Recurse -ErrorAction SilentlyContinue

if ($runShFiles.Count -gt 0) {
    $scriptPath = $runShFiles[0].FullName
    Write-Host "Found run.sh at: $scriptPath" -ForegroundColor Green

    $scriptDir = Split-Path -Parent $scriptPath
    $scriptRelativePath = $scriptPath.Substring($repoPath.Length + 1).Replace("\", "/")

    if (Test-Path $gitBashPath) {
        Write-Host "Executing $scriptRelativePath b using Git Bash..." -ForegroundColor Green

        # Ask for GitHub token
        $githubToken = Read-Host "Please enter your GitHub token (leave empty if not needed)"
        $tokenCommand = ""
        if (-not [string]::IsNullOrWhiteSpace($githubToken)) {
            $tokenCommand = "export GITHUB_TOKEN_CLASSIC='$githubToken'; "
            Write-Host "GitHub token will be set for this session." -ForegroundColor Green
        }

        # Always use a separate window for interactive scripts
        Write-Host "Launching Git Bash in a new window. Please interact with any prompts in that window..." -ForegroundColor Yellow

        # Create a more interactive experience by opening a proper Git Bash window that stays open
        # Add trap to keep window open on errors, and add explicit pause at the end
        $bashArgs = "-c `"$tokenCommand cd '$repoPath' && { { ./$scriptRelativePath b; } || { echo -e '\n\n========== ERROR OCCURRED =========='; echo 'Review the errors above.'; }; }; echo -e '\n\nPress any key to close this window...'; read -n 1`""
        Start-Process -FilePath $gitBashPath -ArgumentList "--login", "-i", $bashArgs

        # Ask user to confirm completion
        $confirmed = Read-Host "Press Enter when the Git Bash script has completed (or Ctrl+C to exit)"
    } else {
        Write-Host "Git Bash not found at expected location." -ForegroundColor Red
        Write-Host "Please run the script manually by opening Git Bash and running:" -ForegroundColor Yellow
        Write-Host "export GITHUB_TOKEN_CLASSIC='your-token'; cd '$repoPath' && ./$scriptRelativePath b" -ForegroundColor Yellow
    }
} else {
    Write-Host "No run.sh script found in the repository. Please check the repository structure." -ForegroundColor Red

    # Ask user if they want to specify the path manually
    $manualPath = Read-Host "Do you want to specify the path to run.sh manually? (Y/N)"

    if ($manualPath -eq "Y" -or $manualPath -eq "y") {
        $customScriptPath = Read-Host "Please enter the full path to the run.sh script"

        if (Test-Path $customScriptPath) {
            Write-Host "Found script at: $customScriptPath" -ForegroundColor Green
            $scriptDir = Split-Path -Parent $customScriptPath

            if (Test-Path $gitBashPath) {
                Write-Host "Executing custom script using Git Bash..." -ForegroundColor Green

                # Ask user if they want to see output in the current console or in a new window
                $showOutput = Read-Host "Do you want to see the script output in the current PowerShell window? (Y/N)"

                # Ask for GitHub token
                $githubToken = Read-Host "Please enter your GitHub token (leave empty if not needed)"
                $tokenCommand = ""
                if (-not [string]::IsNullOrWhiteSpace($githubToken)) {
                    $tokenCommand = "export GITHUB_TOKEN_CLASSIC='$githubToken'; "
                    Write-Host "GitHub token will be set for this session." -ForegroundColor Green
                }

                # Always use a separate window for interactive scripts
                Write-Host "Launching Git Bash in a new window. Please interact with any prompts in that window..." -ForegroundColor Yellow

                # Create a more interactive experience by opening a proper Git Bash window that stays open
                $scriptFileName = Split-Path -Leaf $customScriptPath
                # Add trap to keep window open on errors, and add explicit pause at the end
                $bashArgs = "-c `"$tokenCommand cd '$scriptDir' && { { ./$scriptFileName b; } || { echo -e '\n\n========== ERROR OCCURRED =========='; echo 'Review the errors above.'; }; }; echo -e '\n\nPress any key to close this window...'; read -n 1`""
                Start-Process -FilePath $gitBashPath -ArgumentList "--login", "-i", $bashArgs

                # Ask user to confirm completion
                $confirmed = Read-Host "Press Enter when the Git Bash script has completed (or Ctrl+C to exit)"
            } else {
                Write-Host "Git Bash not found at expected location." -ForegroundColor Red
                Write-Host "Please run the script manually by opening Git Bash and running:" -ForegroundColor Yellow
                Write-Host "cd '$scriptDir' && ./$(Split-Path -Leaf $customScriptPath)" -ForegroundColor Yellow
            }
        } else {
            Write-Host "The specified path does not exist. Please check the path and try again." -ForegroundColor Red
        }
    }
}

# Add trap to handle errors
trap {
    Write-Host "Error occurred: $_" -ForegroundColor Red
    Cleanup-Environment
    Exit 1
}

# Ask if user wants to clean up the network configuration
$cleanupNetwork = Read-Host "Do you want to clean up the network configuration? (Y/N)"
if ($cleanupNetwork -eq "Y" -or $cleanupNetwork -eq "y") {
    Remove-KindNetwork
    Write-Host "Network configuration has been removed." -ForegroundColor Green
} else {
    Write-Host "Network configuration has been preserved for future use." -ForegroundColor Green
}

Write-Host "OpenFrame installation and setup process completed!" -ForegroundColor Green