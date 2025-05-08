# MeshCentral Certificate Mismatch Fix Implementation

This task list addresses the certificate mismatch issue encountered when running the MeshCentral agent installation script on Windows systems.

## Problem Statement

When installing the MeshCentral agent using the win.ps1 script, the agent successfully installs but encounters "Server certificate mismatch" errors when attempting to connect to the server. This occurs despite the script overriding the MSH configuration file.

## Completed Tasks

- [x] Identify certificate mismatch issue from agent logs
- [x] Review current implementation of win.ps1 script
- [x] Research MeshCentral certificate handling from docs and GitHub issues
- [x] Implement modified preservation logic in win.ps1 to address certificate issues
- [x] Create parallel implementation for mac.sh to maintain consistency
- [x] Add force certificate reset parameter to both Windows and Mac scripts

## In Progress Tasks

- [ ] Test solution with a clean installation and upgrade scenario

## Future Tasks

- [ ] Test the solution across different Windows versions and AMT firmware versions
- [ ] Test the solution across different macOS versions
- [ ] Update documentation with new certificate handling procedures
- [ ] Consider implementing improved diagnostics for certificate issues

## Implementation Plan

### Root Cause Analysis

Based on our research, the certificate mismatch issue occurs because:

1. The MeshCentral agent stores server certificate information in multiple places:
   - In the MSH file which contains initial configuration
   - In database files (mesh.db, meshagent.db) which may contain persistent certificate information
   - Potentially in other identity files being preserved during reinstallation

2. Current implementation in both win.ps1 and mac.sh always preserves identity files during reinstallation:
   ```
   # Identity files being preserved during reinstallation
   $IdentityFilesToPreserve = @(
       "mesh.db",           # Main database file
       "meshagent.msh",     # Configuration file
       "meshagent.db",      # Agent database
       "settings.json",     # Agent settings
       "state.json",        # Agent state
       "nodeinfo.json",     # Node information
       "identitydata.json"  # Identity data
   )
   ```

3. When the server certificate changes (or DNS/domain changes), the preserved identity files still contain the old certificate information, causing a mismatch.

### Implemented Solution

We've implemented parallel solutions for both Windows and macOS to maintain consistency:

#### 1. Added Force Certificate Reset Parameter

##### Windows (win.ps1)
```powershell
param(
    [Parameter(Mandatory=$false)]
    [string]$Server,
    
    [Parameter(Mandatory=$false)]
    [string]$NodeId,
    
    [Parameter(Mandatory=$false)]
    [switch]$Help,
    
    [Parameter(Mandatory=$false)]
    [switch]$Uninstall,
    
    [Parameter(Mandatory=$false)]
    [switch]$ForceNewCert
)
```

##### macOS (mac.sh)
```bash
# Parse arguments
for ARG in "$@"; do
  case $ARG in
  --server=*) MESH_SERVER="${ARG#*=}" ;;
  --nodeid=*) NODE_ID="${ARG#*=}" ;;
  --uninstall) UNINSTALL=true ;;
  --force-new-cert) FORCE_NEW_CERT=true ;;
  --help) show_help ;;
  *)
    echo -e "${RED}${CROSS} Unknown argument: $ARG${RESET}"
    show_help
    ;;
  esac
done
```

#### 2. Modified the Identity Preservation Logic

##### Windows (win.ps1)
```powershell
if ($ForceNewCert) {
    Write-ColorMessage "Certificate reset requested. Identity files will be preserved but certificate data will be reset." "Yellow"
    
    # Modified list that excludes certificate-related files
    $IdentityFilesToPreserve = @(
        # Keep minimal identity info, but exclude certificate data
        "nodeinfo.json"     # Node information
    )
    
    $IdentityDirsToPreserve = @()
}
```

##### macOS (mac.sh)
```bash
if [ "$FORCE_NEW_CERT" = true ]; then
    echo -e "${YELLOW}${INFO} Certificate reset requested - will not preserve certificate data${RESET}"
    
    # Modified list that excludes certificate-related files
    IDENTITY_FILES=(
        # Keep minimal identity info, but exclude certificate data
        "nodeinfo.json"     # Node information
    )
    
    IDENTITY_DIRS=()
fi
```

### Usage Instructions

To resolve certificate mismatch issues when reinstalling the agent:

#### Windows
```powershell
.\win.ps1 -Server meshcentral.yourdomain.com -ForceNewCert
```

#### macOS
```bash
sudo ./mac.sh --server=meshcentral.yourdomain.com --force-new-cert
```

### Relevant Files

- client/infrastructure/meshcentral/win.ps1 - Windows installation script to modify
- client/infrastructure/meshcentral/mac.sh - macOS installation script to modify
- Affected database and configuration files:
  - mesh.db - Likely contains certificate trust information
  - meshagent.msh - Contains initial server configuration
  - settings.json - May contain certificate settings 