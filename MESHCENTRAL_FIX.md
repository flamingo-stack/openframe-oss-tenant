# MeshCentral NodeID Persistence Fix

This file documents the implementation plan to fix the issue where Windows clients create multiple devices in MeshCentral due to NodeID persistence problems.

## Problem Identification

The Windows PowerShell script (`win.ps1`) completely removes the installation directory before reinstalling the MeshAgent, causing the device to lose its identity information and register as a new device on each run. While the script attempts to inject NodeID into the MSH file, testing has confirmed this approach doesn't work - likely because MeshCentral stores identity information in SQLite database files that are being deleted during reinstallation.

By contrast, the macOS script (`mac.sh`) only cleans up temporary files but preserves the installation directory, maintaining the database files that store the agent's identity.

## Completed Tasks

- [x] Analyze differences between Windows and macOS MeshCentral installation scripts
- [x] Identify root cause: Windows script is deleting the installation directory including database files
- [x] Test NodeID injection parameter and confirm it doesn't resolve the issue
- [x] Modify the Windows PowerShell script to preserve MeshAgent's database files and identity

## In Progress Tasks

- [x] Identify critical MeshCentral database files that store device identity
- [x] Add logic to preserve database files during reinstallation
- [x] Modify script to only clean temporary files, not the entire installation
- [x] Add an uninstall parameter for complete removal when needed

## Future Tasks

- [ ] Test the updated script on Windows systems
- [ ] Document the changes and update usage guidelines

## Implementation Plan

The main objective is to update the Windows PowerShell script to preserve the MeshAgent's identity information stored in database files. This will involve:

1. Researching which files in the MeshAgent installation store device identity (likely SQLite databases)
2. Checking if an existing installation is present before making changes
3. If present, backing up these identity files before any modifications
4. Only delete temporary files and outdated binaries, not the entire installation
5. Restore identity files if they were backed up
6. Only perform a completely fresh installation if no existing installation is found

### Relevant Files

- client/infrastructure/meshcentral/win.ps1 - Windows PowerShell script to be modified
- client/infrastructure/meshcentral/mac.sh - macOS bash script (used as reference)

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