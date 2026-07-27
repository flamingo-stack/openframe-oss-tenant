# Sysprep specialize script: asserts an SSH server on every target. Mostly a
# no-op on Google Server images; required on the custom Win11 images. Tolerant by
# design — the SSH readiness probe in action.yml is what gates the run.
# See openframe-agent-targets/README.md §3.

$ErrorActionPreference = 'Continue'

function Write-Step { param([string] $Message) Write-Output "[agent-targets] $Message" }

# OpenSSH Server
try {
  $capability = Get-WindowsCapability -Online -Name 'OpenSSH.Server*' -ErrorAction Stop |
                Select-Object -First 1
  if ($capability -and $capability.State -ne 'Installed') {
    Write-Step "installing $($capability.Name)"
    Add-WindowsCapability -Online -Name $capability.Name -ErrorAction Stop | Out-Null
  } else {
    Write-Step 'OpenSSH Server already present'
  }
} catch {
  Write-Step "could not install OpenSSH capability: $($_.Exception.Message)"
}

# Service
try {
  Set-Service -Name sshd -StartupType Automatic -ErrorAction Stop
  Start-Service -Name sshd -ErrorAction Stop
  Write-Step 'sshd running and set to start automatically'
} catch {
  Write-Step "could not start sshd: $($_.Exception.Message)"
}

# Firewall — redundant with the guest agent's rule, harmless where it exists.
# Ingress is already confined to the IAP range by the VPC firewall.
try {
  if (-not (Get-NetFirewallRule -Name 'agent-targets-ssh' -ErrorAction SilentlyContinue)) {
    New-NetFirewallRule -Name 'agent-targets-ssh' -DisplayName 'agent-targets SSH' `
      -Direction Inbound -Protocol TCP -LocalPort 22 -Action Allow -ErrorAction Stop | Out-Null
    Write-Step 'firewall rule for tcp/22 added'
  }
} catch {
  Write-Step "could not add firewall rule: $($_.Exception.Message)"
}

# Default shell -> PowerShell (OpenSSH defaults to cmd, which mangles our scripts).
try {
  $key = 'HKLM:\SOFTWARE\OpenSSH'
  if (-not (Test-Path $key)) { New-Item -Path $key -Force | Out-Null }
  New-ItemProperty -Path $key -Name DefaultShell -PropertyType String -Force `
    -Value "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe" | Out-Null
  Write-Step 'default SSH shell set to PowerShell'
} catch {
  Write-Step "could not set default shell: $($_.Exception.Message)"
}
