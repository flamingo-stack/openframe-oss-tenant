# Assert the agent came up and brought its tool agents with it. Exit 0 if every
# required check passed, else 1; optional agents (tactical-rmm) never fatal.
# What each check means is documented in tests/agent-targets/README.md.
[CmdletBinding()]
param(
  [int] $TimeoutSeconds = 300
)

$ErrorActionPreference = 'Continue'

$appSupport = Join-Path $env:ProgramData 'OpenFrame'
$secured    = Join-Path $appSupport 'secured'
$logDir     = Join-Path $appSupport 'logs'
$exe        = Join-Path $env:ProgramFiles 'OpenFrame\openframe-client.exe'
$service    = 'com.openframe.client'

$script:failures = 0
$script:warnings = 0

function Assert-Check {
  param([string] $Name, [scriptblock] $Test, [switch] $Optional)
  $ok = $false
  try { $ok = [bool](& $Test) } catch { $ok = $false }

  if ($ok) {
    Write-Host "PASS  $Name"
  } elseif ($Optional) {
    Write-Host "WARN  $Name (not required)"
    $script:warnings++
  } else {
    Write-Host "FAIL  $Name"
    $script:failures++
  }
}

# Enrolment is asynchronous (register -> receive tool messages -> download), so
# poll rather than sample once.
function Wait-For {
  param([scriptblock] $Test, [int] $Seconds = $TimeoutSeconds)
  $deadline = (Get-Date).AddSeconds($Seconds)
  while ((Get-Date) -lt $deadline) {
    try { if (& $Test) { return $true } } catch { }
    Start-Sleep -Seconds 5
  }
  return $false
}

function Test-ToolAgent {
  # tool_agent_id is server-assigned; match on substring the way the client does.
  param([string] $Needle)
  if (-not (Test-Path $appSupport)) { return $false }
  return [bool](Get-ChildItem -Path $appSupport -Directory -ErrorAction SilentlyContinue |
                Where-Object { $_.Name -like "*$Needle*" })
}

Write-Host '=== binary and layout ==='
Assert-Check 'agent binary installed'        { Test-Path $exe }
Assert-Check 'app support directory created' { Test-Path $appSupport }

Write-Host ''
Write-Host '=== service ==='
Assert-Check "service $service is running" {
  Wait-For { (Get-Service -Name $service -ErrorAction SilentlyContinue).Status -eq 'Running' }
}
Assert-Check "service $service starts automatically" {
  (Get-Service -Name $service -ErrorAction SilentlyContinue).StartType -eq 'Automatic'
}

Write-Host ''
Write-Host '=== enrolment ==='
Assert-Check 'initial configuration persisted' {
  Wait-For { (Get-Item (Join-Path $secured 'initial_config.json') -ErrorAction SilentlyContinue).Length -gt 0 }
}

Write-Host ''
Write-Host '=== tool agents ==='
foreach ($tool in @('meshcentral', 'fleet')) {
  Assert-Check "tool agent matching '*$tool*' installed" { Wait-For { Test-ToolAgent $tool } }
}
# Compatibility only; being removed platform-wide.
Assert-Check "tool agent matching '*tactical*' installed" { Test-ToolAgent 'tactical' } -Optional

Write-Host ''
Write-Host '=== logs ==='
$log = Get-ChildItem -Path $logDir -Filter 'openframe*.log' -Recurse -ErrorAction SilentlyContinue |
       Sort-Object LastWriteTime -Descending | Select-Object -First 1

Assert-Check 'agent produced log output' { $null -ne $log -and $log.Length -gt 0 }

if ($log) {
  $bad = Select-String -Path $log.FullName -Pattern 'panicked at|FATAL' -ErrorAction SilentlyContinue
  if ($bad) {
    Write-Host 'FAIL  agent log contains a panic or fatal error'
    $bad | Select-Object -Last 20 | ForEach-Object { Write-Host "      $($_.Line)" }
    $script:failures++
  } else {
    Write-Host 'PASS  agent log is free of panics'
  }
}

Write-Host ''
Write-Host "summary: $script:failures failure(s), $script:warnings warning(s)"
exit ($(if ($script:failures -gt 0) { 1 } else { 0 }))
