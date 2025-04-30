# OpenFrame Client Debugging Fixes

This task list outlines the plan to fix debug properties for the Rust client debugging configuration.

## Completed Tasks

- [x] Identify current debug configuration in launch.json
- [x] Examine Rust project structure in client folder
- [x] Verify binary name and path in Cargo.toml
- [x] Verify that the pre-launch task "rust-build" exists in tasks.json
- [x] Check the structure of the client's src directory
- [x] Check that the debug binary path is correctly configured
- [x] Test the current debugging configuration to identify specific issues
- [x] Investigate how logging directories are determined in the codebase
- [x] Update the launch.json configuration to fix logging permissions issue
- [x] Add custom environment variables to avoid filesystem permission errors
- [x] Improve code to automatically create the custom log directory

## In Progress Tasks

- [ ] Test updated debugging configuration

## Future Tasks

- [ ] Document debugging procedures for the team

## Implementation Plan

The debugging configuration for the OpenFrame Rust client needs to be properly configured to ensure developers can effectively troubleshoot issues. This plan focuses on examining and fixing the configurations in VSCode's launch.json and tasks.json files.

### Findings

1. The binary name in Cargo.toml is correctly set as "openframe"
2. The pre-launch task "rust-build" exists in tasks.json and is properly configured
3. The debug configuration in launch.json points to the correct binary path
4. The client codebase has a standard Rust structure with main.rs and lib.rs
5. The binary exists at the expected location in target/debug/openframe
6. When running the binary, it fails with a permission error: "Failed to create directory /Library/Logs/OpenFrame: Permission denied (os error 13)"
7. The logging system in `src/logging/mod.rs` initializes directories via the `DirectoryManager`
8. The `DirectoryManager` supports custom log directories via `with_custom_dirs` and `with_user_logs_dir`
9. The `get_logs_directory()` function returns platform-specific paths (on macOS: `/Library/Logs/OpenFrame`)

### Identified Issues

1. **Permission Issues**: The binary attempts to create logs in /Library/Logs/OpenFrame which requires root privileges. This will cause debugging to fail unless run with elevated permissions.
2. **Solution Options**: We have several options to solve this problem:
   - Use `DirectoryManager::with_user_logs_dir()` to get user-specific log directories
   - Use `DirectoryManager::with_custom_dirs()` to set custom log directories
   - Set environment variables to control where logs are stored

### Solution Implemented

1. Updated the launch.json configuration to include an environment variable `OPENFRAME_DEV_MODE=true` to indicate development mode
2. Added the `OPENFRAME_LOG_DIR` environment variable to specify a user-writable log directory in client/logs
3. Updated the client directory code to check for the OPENFRAME_LOG_DIR environment variable
4. Added "run" to the args array to explicitly run the client in direct mode (without service wrapper)
5. Improved the code to automatically create the custom log directory when specified through the environment variable

### Changes Made

1. Updated launch.json for all three Rust configurations:
   - Added environment variable OPENFRAME_DEV_MODE=true
   - Added environment variable OPENFRAME_LOG_DIR=${workspaceFolder}/client/logs
   - Added "run" to the args array to run in direct mode

2. Modified client/src/platform/directories.rs:
   - Added environment variable check in get_logs_directory()
   - Added code to use custom directory when OPENFRAME_LOG_DIR is set
   - Added automatic directory creation for the custom log directory

### Next Steps

1. Test the updated configuration to verify it resolves the permission issues
2. Create documentation for the team about debugging the client application

### Relevant Files

- .vscode/launch.json - Contains debug launch configurations
- .vscode/tasks.json - Contains build tasks used before launching
- client/Cargo.toml - Defines the Rust project structure and binary name
- client/src/main.rs - Main entry point for the Rust application
- client/src/logging/mod.rs - Contains the logging setup code
- client/src/platform/directories.rs - Contains directory management code 