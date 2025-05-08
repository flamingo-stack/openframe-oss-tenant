# MeshCentral NodeID Persistence Fix

This file documents the implementation plan to fix the issue where Windows clients create multiple devices in MeshCentral due to NodeID persistence problems, and to ensure consistency between Windows and macOS scripts.

## Problem Identification

The Windows PowerShell script (`win.ps1`) completely removes the installation directory before reinstalling the MeshAgent, causing the device to lose its identity information and register as a new device on each run. While the script attempts to inject NodeID into the MSH file, testing has confirmed this approach doesn't work - likely because MeshCentral stores identity information in SQLite database files that are being deleted during reinstallation.

By contrast, the macOS script (`mac.sh`) only cleans up temporary files but preserves the installation directory, maintaining the database files that store the agent's identity. However, for consistency and future maintainability, both scripts should follow a similar structure and approach to preserving identity information.

## Completed Tasks

- [x] Analyze differences between Windows and macOS MeshCentral installation scripts
- [x] Identify root cause: Windows script is deleting the installation directory including database files
- [x] Test NodeID injection parameter and confirm it doesn't resolve the issue
- [x] Modify the Windows PowerShell script to preserve MeshAgent's database files and identity
- [x] Identify critical MeshCentral database files that store device identity
- [x] Add logic to preserve database files during reinstallation in Windows script
- [x] Modify Windows script to only clean temporary files, not the entire installation
- [x] Add an uninstall parameter for complete removal when needed in Windows script
- [x] Create plan for modifying the macOS script for consistency with Windows
- [x] Update macOS script to match Windows script structure and functionality
- [x] Add explicit identity file preservation logic to macOS script
- [x] Add uninstall parameter to macOS script
- [x] Improve error handling in both scripts

## Future Tasks

- [ ] Test the updated scripts on Windows and macOS systems
- [ ] Document the changes and update usage guidelines

## Implementation Plan for macOS Script

The macOS script has been modified to follow a similar structure as the Windows script with the following changes:

1. Added an explicit `--uninstall` parameter for complete removal
2. Enhanced backup and restoration of identity files
3. Added more detailed logging of files being preserved
4. Structured the code to match the Windows script's logical flow
5. Standardized parameter names and documentation between scripts

### Completed Modifications for mac.sh

1. **Parameter Handling**:
   - Added `--uninstall` parameter
   - Kept consistent parameter naming conventions

2. **Identity Preservation**:
   - Added explicit functions for backing up and restoring identity files
   - Used the same list of identity files/directories as the Windows script
   - Added more detailed logging about preserved files

3. **Cleanup Process**:
   - Ensured cleanup only removes temporary files
   - Added selective cleaning that preserves identity files
   - Matched removal logic with Windows script

4. **Uninstall Functionality**:
   - Added complete uninstall option that removes all files
   - Included cleanup of macOS-specific locations
   - Added launch daemon cleanup

5. **Code Structure**:
   - Standardized function names and behavior
   - Matched the overall flow of installation steps
   - Improved error handling

The goal was to maintain the existing functionality while making both scripts more consistent, easier to maintain, and more robust.

### Relevant Files

- client/infrastructure/meshcentral/win.ps1 - Windows PowerShell script (modified)
- client/infrastructure/meshcentral/mac.sh - macOS bash script (modified)

### MeshCentral Identity Files (Identified)

MeshCentral stores device identity in the following files:
- mesh.db - Main database file
- meshagent.msh - Configuration file
- meshagent.db - Agent database
- settings.json - Agent settings
- state.json - Agent state
- nodeinfo.json - Node information
- identitydata.json - Identity data

And within these directories:
- data - Data directory
- db - Database directory
- config - Configuration directory

## Implementation Log

### [Current Date]
- Started implementation of the Windows script modifications
- Focusing on preserving MeshAgent's database files during reinstallation
- Identified key database and configuration files that need to be preserved
- Added backup and restore functions for identity files
- Modified the Remove-Directory function to selectively preserve identity files
- Added an uninstall parameter for complete removal when needed
- Implemented logic to check for existing installation before performing any changes
- Changed script behavior to preserve the existing configuration file if available
- Added detailed logging to enhance troubleshooting capabilities
- Prepared plan for updating the macOS script for consistency
- Started implementation of macOS script modifications
- Added identity file preservation to the macOS script
- Added selective directory cleanup to preserve identity files
- Implemented a proper uninstall parameter
- Added backup and restore functions to the macOS script
- Enhanced error handling and added detailed logging
- Made both scripts consistent in structure and functionality 