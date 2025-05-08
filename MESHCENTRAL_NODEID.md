# MeshCentral NodeID Parameter Implementation

This feature adds a new optional `--nodeid` parameter to MeshCentral execution scripts that will inject a specified NodeID into the downloaded MSH file.

## Completed Tasks

- [x] Initial analysis of requirements
- [x] Creation of implementation plan
- [x] Examine current mac.sh script structure
- [x] Examine current win.ps1 script structure
- [x] Add `--nodeid` parameter to mac.sh script
- [x] Add `--nodeid` parameter to win.ps1 script
- [x] Update parameter validation in both scripts
- [x] Add logic to inject NodeID into MSH file in mac.sh
- [x] Add logic to inject NodeID into MSH file in win.ps1
- [x] Add enhanced file destination and execution location output
- [x] Update documentation to reflect new parameter option

## Future Tasks

- [ ] Test implementation on Mac OS
- [ ] Test implementation on Windows

## Implementation Summary

The feature has been implemented in both scripts, providing the ability to inject a custom NodeID into the MSH configuration file:

1. For mac.sh:
   - Added the `--nodeid` parameter to the argument parsing section
   - Added the parameter to the help documentation with an example
   - Implemented logic to append the NodeID to the MSH file after download
   - Added detailed output showing all file paths and execution locations

2. For win.ps1:
   - Added a `NodeId` parameter to the script's parameter block
   - Added the parameter to the help documentation with an example
   - Implemented logic to append the NodeID to the MSH file after download
   - Added detailed output showing all file paths and execution locations

### Changes Made

#### mac.sh
- Added a new `NODE_ID` variable to store the parameter value
- Added parameter parsing for `--nodeid=*` option
- Added NodeID injection code after the MSH file is downloaded
- Updated help documentation to include the new parameter
- Added clear output showing file destinations and execution locations
- Improved variable consistency by using named variables for file paths

#### win.ps1
- Added a new `NodeId` parameter to the parameter block
- Added NodeID injection code after the MSH file is downloaded
- Updated help documentation to include the new parameter
- Added clear output showing file destinations and execution locations
- Improved variable consistency by using named variables for file paths

### Testing Instructions

To test the implementation:

#### Mac OS:
```bash
sudo ./mac.sh --server=meshcentral.yourdomain.com --nodeid="node//your-custom-node-id"
```

#### Windows:
```powershell
.\win.ps1 -Server meshcentral.yourdomain.com -NodeId "node//your-custom-node-id"
```

The output will now clearly show:
- All file download destinations
- Where configuration files are stored
- Where the agent binary is located
- Where the agent is being executed from

Verify that:
1. The NodeID gets correctly added to the MSH file
2. All file locations are properly displayed in the output

## Implementation Plan

We will modify both the mac.sh and win.ps1 scripts to accept an optional `--nodeid` parameter. When provided, this parameter's value will be added to the end of the generated MSH file as:

```
NodeID=<provided-value>
```

The implementation will:
1. Add parameter parsing for `--nodeid` in both scripts
2. Add validation for the NodeID value (if needed)
3. Modify the MSH file generation process to include the NodeID line if the parameter is provided
4. Ensure backward compatibility (scripts should work the same when the parameter is not provided)

### Script Analysis Findings

#### mac.sh Script
- Parameters are parsed in the "Parse arguments" section (around line 130-140)
- The MSH file is downloaded from the server at line 193:
  `CONFIG_URL="https://$MESH_SERVER/openframe_public/meshagent.msh"`
- The file is downloaded to `$TEMP_DIR/meshagent.msh`
- No current modification of the MSH file content is performed

#### win.ps1 Script
- Parameters are declared at the top of the script and parsed automatically by PowerShell
- The MSH file is downloaded from the server at line 246-249:
  `$configUrl = "https://$Server/openframe_public/meshagent.msh"`
  `$configPath = Join-Path $TempDir "meshagent.msh"`
- The file is downloaded to `$TempDir/meshagent.msh`
- No current modification of the MSH file content is performed

### Relevant Files

- client/infrastructure/meshcentral/mac.sh - MeshCentral installation script for macOS
- client/infrastructure/meshcentral/win.ps1 - MeshCentral installation script for Windows

### Technical Approach

1. For mac.sh:
   - Add `--nodeid=*` option to the parameter parsing section
   - Add a condition after downloading the MSH file to append the NodeID line if the parameter was provided
   - Use `echo "NodeID=$NODE_ID" >> "$TEMP_DIR/meshagent.msh"` to append the line

2. For win.ps1:
   - Add a new `[string]$NodeId` parameter to the param block at the top of the script
   - Add a condition after downloading the MSH file to append the NodeID line if the parameter was provided
   - Use `Add-Content -Path $configPath -Value "NodeID=$NodeId"` to append the line

3. For both scripts:
   - Include the new parameter in the help text
   - Ensure the changes preserve all current functionality 