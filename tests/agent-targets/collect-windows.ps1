# Pull the agent's diagnostics off a target before it is destroyed. Best-effort:
# always exits 0. Uploads via the GCS JSON API with the metadata token (no gcloud
# on Windows images). See tests/agent-targets/README.md.
[CmdletBinding()]
param(
  [string] $Destination = ''
)

$ErrorActionPreference = 'Continue'

$appSupport = Join-Path $env:ProgramData 'OpenFrame'
$logDir     = Join-Path $appSupport 'logs'
$staging    = Join-Path $env:TEMP ('agent-targets-diag-' + [guid]::NewGuid().ToString('N'))

New-Item -ItemType Directory -Path $staging -Force | Out-Null

try {
  if (Test-Path $logDir) {
    Copy-Item $logDir (Join-Path $staging 'agent-logs') -Recurse -ErrorAction SilentlyContinue
  }

  $state = Join-Path $staging 'state'
  New-Item -ItemType Directory -Path $state -Force | Out-Null
  Get-ChildItem -Path $appSupport -Filter '*.json' -Depth 1 -ErrorAction SilentlyContinue |
    Copy-Item -Destination $state -ErrorAction SilentlyContinue

  # initial_config.json carries the enrolment key — redact, do not exclude.
  $cfg = Join-Path $state 'initial_config.json'
  if (Test-Path $cfg) {
    (Get-Content $cfg -Raw) -replace '("initial_key"\s*:\s*")[^"]*"', '$1REDACTED"' |
      Set-Content (Join-Path $state 'initial_config.redacted.json')
    Remove-Item $cfg -Force -ErrorAction SilentlyContinue
  }

  $report = Join-Path $staging 'system.txt'
  & {
    '=== os ==='
    Get-CimInstance Win32_OperatingSystem | Format-List Caption, Version, BuildNumber, OSArchitecture
    ''
    '=== service ==='
    Get-Service -Name 'com.openframe.client' -ErrorAction SilentlyContinue | Format-List *
    ''
    '=== service event log ==='
    Get-WinEvent -FilterHashtable @{ LogName = 'System'; StartTime = (Get-Date).AddHours(-2) } `
      -ErrorAction SilentlyContinue |
      Where-Object { $_.Message -match 'openframe' } |
      Select-Object -First 100 TimeCreated, Id, LevelDisplayName, Message | Format-List
    ''
    '=== app support tree ==='
    Get-ChildItem -Path $appSupport -Recurse -ErrorAction SilentlyContinue |
      Select-Object -First 300 FullName, Length, LastWriteTime | Format-Table -AutoSize
  } *>&1 | Out-File -FilePath $report -Encoding utf8

  $bundle = Join-Path $env:TEMP 'agent-targets-diagnostics.zip'
  Remove-Item $bundle -Force -ErrorAction SilentlyContinue
  Compress-Archive -Path (Join-Path $staging '*') -DestinationPath $bundle -ErrorAction SilentlyContinue

  if ($Destination -and (Test-Path $bundle)) {
    $without = $Destination -replace '^gs://', ''
    $bucket  = $without.Split('/')[0]
    $object  = ($without.Substring($bucket.Length + 1)).TrimEnd('/') + '/diagnostics.zip'

    try {
      $token = (Invoke-RestMethod -UseBasicParsing `
        -Headers @{ 'Metadata-Flavor' = 'Google' } `
        -Uri 'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token').access_token

      $uri = "https://storage.googleapis.com/upload/storage/v1/b/$bucket/o?uploadType=media&name=" +
             [uri]::EscapeDataString($object)

      Invoke-RestMethod -Method Post -Uri $uri -UseBasicParsing `
        -Headers @{ Authorization = "Bearer $token" } `
        -ContentType 'application/zip' `
        -InFile $bundle | Out-Null

      Write-Host "uploaded diagnostics to $Destination/diagnostics.zip"
    } catch {
      Write-Warning "upload to $Destination failed: $($_.Exception.Message)"
    }
  }

  Write-Host '=== collected diagnostics (tail) ==='
  Get-Content $report -Tail 200 -ErrorAction SilentlyContinue
}
finally {
  Remove-Item -Recurse -Force $staging -ErrorAction SilentlyContinue
}

exit 0
