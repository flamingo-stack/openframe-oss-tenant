# Install the OpenFrame agent on a Windows agent-targets target and enrol it.
# Runs elevated over SSH on a machine that has never seen OpenFrame. See README.
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string] $ArtifactUrl,
  [string] $ArtifactSha256 = '',
  [Parameter(Mandatory = $true)][string] $ServerUrl,
  [Parameter(Mandatory = $true)][string] $InitialKey,
  [Parameter(Mandatory = $true)][string] $OrgId,
  [string] $Tags = ''
)

$ErrorActionPreference = 'Stop'
$ProgressPreference    = 'SilentlyContinue'   # progress bars slow Invoke-WebRequest over SSH

$workdir = Join-Path $env:TEMP ("agent-targets-" + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $workdir -Force | Out-Null

try {
  Write-Host "==> downloading $ArtifactUrl"
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  $artifact = Join-Path $workdir 'artifact'
  Invoke-WebRequest -Uri $ArtifactUrl -OutFile $artifact -UseBasicParsing

  # Optional today only because the release pipeline publishes no checksums (README, Known gaps).
  if ($ArtifactSha256) {
    Write-Host '==> verifying sha256'
    $actual = (Get-FileHash -Path $artifact -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($actual -ne $ArtifactSha256.ToLowerInvariant()) {
      throw "sha256 mismatch: expected $ArtifactSha256, got $actual"
    }
  } else {
    Write-Warning 'No -ArtifactSha256 supplied; the downloaded installer was NOT integrity-checked'
  }

  Write-Host '==> installing'
  $installRoot = Join-Path $env:ProgramFiles 'OpenFrame'
  New-Item -ItemType Directory -Path $installRoot -Force | Out-Null

  switch -Regex ($ArtifactUrl) {
    '\.msi$' {
      $log = Join-Path $workdir 'msi.log'
      $proc = Start-Process msiexec.exe -Wait -PassThru -ArgumentList @(
        '/i', "`"$artifact`"", '/qn', '/norestart', '/l*v', "`"$log`""
      )
      if ($proc.ExitCode -ne 0) {
        Get-Content $log -Tail 80 | ForEach-Object { Write-Host "      $_" }
        throw "msiexec failed with exit code $($proc.ExitCode)"
      }
    }
    '\.zip$' {
      # Raw-binary path: no service/dir/enrolment hook — all handled below.
      $extract = Join-Path $workdir 'extract'
      Expand-Archive -Path $artifact -DestinationPath $extract -Force
      $binary = Get-ChildItem -Path $extract -Recurse -Filter 'openframe*.exe' |
                Select-Object -First 1
      if (-not $binary) { throw 'No openframe*.exe found inside the archive' }
      # Path must match Service::exec_path() in clients/openframe-client/src/service.rs.
      Copy-Item $binary.FullName (Join-Path $installRoot 'openframe-client.exe') -Force
    }
    default { throw "Unsupported artifact type: $ArtifactUrl" }
  }

  $exe = Join-Path $installRoot 'openframe-client.exe'
  if (-not (Test-Path $exe)) { throw "Agent binary not present at $exe after install" }

  Write-Host '==> enrolling'
  $installArgs = @(
    'install',
    '--serverUrl',  $ServerUrl,
    '--initialKey', $InitialKey,
    '--orgId',      $OrgId
  )
  # `--tag` is repeatable (clap Vec<String>), not comma-separated.
  if ($Tags) { foreach ($t in $Tags.Split(',')) { $installArgs += @('--tag', $t.Trim()) } }

  & $exe @installArgs
  if ($LASTEXITCODE -ne 0) { throw "openframe-client install exited with $LASTEXITCODE" }

  Write-Host '==> installed'
  Get-Service -Name 'com.openframe.client' -ErrorAction SilentlyContinue |
    Format-List Name, Status, StartType
}
finally {
  Remove-Item -Recurse -Force $workdir -ErrorAction SilentlyContinue
}
