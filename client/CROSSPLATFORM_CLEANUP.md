# OpenFrame Client Cross-Platform Refactor & Cleanup

Brief description:  
This task list tracks the cleanup and refactor of the OpenFrame client to ensure it is cross-platform (macOS, Windows, Linux), service-based, uses a strong and consistent logging library, and supports running/executing scripts as root/admin.

## Important Guidelines
- All work must be done ONLY in the @client folder.
- The logging framework must be properly configured and tested for all supported operating systems (macOS, Windows, Linux). It is already working on macOS; ensure equivalent support and configuration for other platforms.
- Installation must remain easy and intuitive for users. For example, on macOS, installation should continue to be a simple one PKG file. Equivalent simplicity should be maintained for other platforms.
- Keep implementation changes minimal - prefer enhancing existing code rather than complete rewrites.

## Implementation Approach

### Selected Libraries and Technologies

For our cross-platform implementation, we will use the following libraries:

1. **Service Management**: `service-manager` crate (v0.8+)
   - Provides adapters for Windows Service, Launchd (macOS), systemd (Linux), and others
   - Offers a unified API with platform-specific implementations
   - Will be integrated as a thin wrapper around our existing service code
   - Website: https://github.com/chipsenkbeil/service-manager-rs

2. **Logging**: Continue with `tracing` and `tracing-subscriber`
   - Already well-structured for cross-platform support
   - Need to improve platform-specific path configurations
   - Will enhance JSON formatting for better compatibility with centralized logging

### Testing Procedure

To ensure we don't break existing functionality while making changes:

1. **MacOS Testing**:
   - Continue to use `build-package.sh` to build and test the macOS package
   - After each significant change, build the package and run a full installation test
   - Command to build: `cd client && ./scripts/build-package.sh`
   - Command to install: `sudo installer -pkg target/dist/OpenFrame-Setup.pkg -target /`
   - Check logs after installation: `cat /Library/Logs/OpenFrame/openframe.log`
   - Verify service is running: `launchctl list | grep openframe`

2. **Incremental Changes**:
   - Make small, focused changes and test after each one
   - Use feature flags to gradually introduce cross-platform functionality
   - First focus on refactoring `DirectoryManager` for cross-platform support
   - Then integrate `service-manager` with existing service.rs

3. **Cross-Platform Testing**:
   - As we progress, we'll create equivalent build scripts for Windows and Linux
   - Use virtual machines or containers for testing other platforms
   - Create automated tests that can be run on all platforms

## Cross-Platform Architecture

The following diagram illustrates the target architecture for the OpenFrame client, showing how platform-specific code is abstracted through common interfaces:

```
                                 ┌─────────────────────────────────┐
                                 │      Client Application          │
                                 └───────────────┬─────────────────┘
                                                 │
                         ┌─────────────────────────────────────────────┐
                         │                                             │
          ┌──────────────▼─────────────┐              ┌───────────────▼──────────────┐
          │      Service Manager        │              │        Logging System        │
          │  (service lifecycle mgmt)   │              │   (tracing & subscribers)    │
          └──────────────┬─────────────┘              └───────────────┬──────────────┘
                         │                                             │
    ┌───────────────────────────────────┐            ┌─────────────────────────────────┐
    │                                   │            │                                 │
┌───▼───────────┐   ┌────────▼────────┐   ┌─────────▼──────┐    ┌──────────▼──────────┐
│ Windows Impl  │   │   MacOS Impl    │   │  Windows Impl   │    │     MacOS Impl      │
│ windows-      │   │   launchd       │   │ tracing-appender│    │  tracing-appender   │
│ service       │   │                 │   │ + Windows paths │    │  + MacOS paths      │
└───────────────┘   └────────┬────────┘   └─────────────────┘    └──────────┬──────────┘
                             │                                               │
                    ┌────────▼────────┐                             ┌────────▼────────┐
                    │   Linux Impl    │                             │   Linux Impl    │
                    │   systemd       │                             │ tracing-appender│
                    │   init.d        │                             │ + Linux paths   │
                    └─────────────────┘                             └─────────────────┘
                    
                    
┌─────────────────────────────────┐              ┌────────────────────────────────┐
│    Platform Directory Manager    │              │      Permission Manager        │
└──────────────┬──────────────────┘              └───────────────┬────────────────┘
               │                                                  │
    ┌──────────────────────────────────┐            ┌───────────────────────────────┐
    │                                  │            │                               │
┌───▼───────────┐   ┌────────▼────────┐   ┌────────▼─────────┐   ┌─────────▼───────┐
│ Windows Paths │   │   MacOS Paths   │   │   Windows ACLs   │   │   MacOS Perms   │
└───────────────┘   └────────┬────────┘   └──────────────────┘   └─────────┬───────┘
                             │                                              │
                    ┌────────▼────────┐                            ┌────────▼───────┐
                    │   Linux Paths   │                            │   Linux Perms  │
                    └─────────────────┘                            └────────────────┘
                    
                    
┌─────────────────────────────────────┐             ┌─────────────────────────────────┐
│     Package/Installation System      │             │          Runtime System         │
└───────────────┬─────────────────────┘             └──────────────┬──────────────────┘
                │                                                   │
    ┌───────────────────────────────────┐           ┌─────────────────────────────────┐
    │                                   │           │                                 │
┌───▼───────────┐   ┌────────▼────────┐   ┌────────▼─────────┐   ┌─────────▼─────────┐
│ Windows MSI   │   │   MacOS PKG     │   │  Windows Client  │   │   MacOS Client    │
└───────────────┘   └────────┬────────┘   └──────────────────┘   └─────────┬─────────┘
                             │                                              │
                    ┌────────▼────────┐                            ┌────────▼─────────┐
                    │ Linux DEB/RPM   │                            │   Linux Client   │
                    └─────────────────┘                            └─────────────────-┘
```

This architecture follows these key principles:

1. **Common Interfaces**: Each major subsystem exposes a platform-agnostic API
2. **Platform-Specific Implementations**: Platform-specific code is isolated in implementation modules
3. **Adapter Pattern**: Platform-specific code is wrapped with adapters that implement common interfaces
4. **Compile-Time Resolution**: Platform selection happens at compile time via feature flags and conditional compilation

## Completed Tasks

- [x] Review current client codebase and identify platform-specific or legacy code
  - Identified primary platform-specific code in `src/platform/` directory
  - Found conditional compilation for Windows vs Unix in `service.rs`
  - Discovered macOS-specific paths in `DirectoryManager`
  - Identified Windows-specific dependencies in `Cargo.toml`
  - Found Unix-specific permission handling in `permissions.rs`

- [x] Research existing cross-platform support
  - Found `logging/platform.rs` with excellent cross-platform path handling
  - Discovered platform-specific service implementations using feature flags
  - Identified configuration in `agent.toml` that already includes some platform-specific settings
  - Noted existing proper use of `target_os` flags for Windows, macOS, and Linux

- [x] Research cross-platform best practices for Rust applications
  - Found that using platform-specific adapters with a common interface is preferred over a single cross-platform library
  - Identified that the existing approach with conditional compilation is a standard Rust pattern
  - Discovered `service-manager` crate which provides a unified API for different service managers
  - Confirmed `tracing` with `tracing-subscriber` as the recommended modern logging solution

- [x] Refactor `DirectoryManager` to use platform-agnostic paths
  - Implemented platform-specific functions for paths (similar to `logging/platform.rs`)
  - Added `get_logs_directory()` and `get_app_support_directory()` functions
  - Created platform-specific implementations for Windows, macOS, and Linux
  - Added `set_directory_permissions()` function with platform-specific implementations
  - Updated unit tests to include platform-specific assertions
  - Maintained backward compatibility with existing macOS implementation
  - Added new `user_logs_dir` field to handle per-user logs separately from system logs
  - Integrated health check functionality to validate directory permissions
  - Implemented cross-platform support for both system and user log directories
  - Built and tested on macOS to verify integration with the daemon service

- [x] Clean up installation scripts to remove unnecessary test files
  - Identified and removed temporary log file creation in postinstall script
  - Ensured proper permissions are set on log directories
  - Verified daemon continues to work with updated DirectoryManager

- [x] Research and select a cross-platform service management library
  - Evaluated existing usage of `daemonize` for Unix and `windows-service` for Windows
  - Selected `service-manager` crate that supports Windows Service, Launchd (macOS), systemd and other service managers
  - Implemented a minimal adapter pattern in `service_adapter.rs` rather than a full replacement of existing code

- [x] Enhance logging framework for cross-platform consistency
  - Updated logging module to use the improved DirectoryManager exclusively
  - Consolidated the overlapping functionality in `logging/platform.rs` and `platform/directories.rs`
  - Ensured consistent log file handling across platforms
  - Added better error handling for permission issues when writing logs
  - Added documentation for cross-platform usage
  - Fixed critical bug in `JsonVisitor::record_debug` implementation to properly capture message fields
  - Ensured messages are correctly captured regardless of whether they pass through `record_str` or `record_debug`

- [x] Identify and list all code that is not cross-platform or is obsolete
  - Documented platform-specific code with conditional compilation
  - Created a `cross-platform-check.sh` script to track progress
  - Identified service implementation has platform-specific branches
  - Installation scripts only support macOS

- [x] Create platform-specific installation packages
  - Created Windows MSI installer script (`scripts/win/build-package-windows.ps1`)
  - Created Linux DEB/RPM packages script (`scripts/nix/build-package-linux.sh`)
  - Organized macOS PKG installer in `scripts/mac/build-package.sh`
  - Included pre/post installation scripts for proper service setup on each platform

- [x] Implement cross-platform service management
  - Created `CrossPlatformServiceManager` for uniform service operations
  - Implemented platform-agnostic service API
  - Used adapter pattern to work with `service-manager` crate
  - Updated `service.rs` to use the adapter across all platforms
  - Added proper service lifecycle management (install/uninstall/start/stop)
  - Added documentation for cross-platform service usage

- [x] Consolidate and refactor build scripts
  - Removed platform-specific build scripts in favor of a unified approach
  - Removed `client/scripts/build-package-windows.ps1`
  - Removed `client/scripts/build-package-linux.sh`
  - Removed `client/scripts/mac/build-package.sh`
  - Removed the no longer needed cross-platform check script (`client/scripts/cross-platform-check.sh`)
  - Removed debug installation script (`client/debug-install.sh`)
  - Implemented a more streamlined and consistent build process across platforms

## In Progress Tasks

- [x] Implement and test root/admin execution on all platforms
  - Windows: Added proper UAC handling and service elevation
  - Linux: Implemented sudo and pkexec integration with proper permissions
  - macOS: Maintained current root execution approach
  - Added capability checks on startup to verify permissions

- [x] Add automated tests for service management, logging, and root execution
  - Created tests that can run on all platforms (test_is_admin, test_has_capability, etc.)
  - Implemented platform-specific test cases where needed (Windows/Unix tests)
  - Added comprehensive error handling for cross-platform operations

- [ ] Implement unified build system
  - Create a single entry point for building on all platforms
  - Integrate platform detection and selection of appropriate build procedures
  - Add consistent error handling and reporting across build processes
  - Ensure compatibility with CI/CD pipelines

## Future Tasks

- [ ] Update documentation for new architecture and usage
  - Document installation procedures for each platform
  - Create troubleshooting guides
  - Add development guidelines for maintaining cross-platform compatibility

- [ ] Implement proper cleanup procedures for failed installations or upgrades
  - Ensure clean uninstallation across all platforms
  - Add rollback capability for failed upgrades

## Implementation Plan

1. **Cross-Platform Architecture**
   - Use the adapter pattern for platform-specific code
   - Create abstract interfaces with platform-specific implementations
   - Leverage conditional compilation (`#[cfg(target_os = "...")]`) for platform-specific code
   - Aim for compile-time resolution of platform differences where possible

2. **Service Management**
   - Consider using the `service-manager` crate as a thin wrapper around existing implementations
   - Keep existing Windows and macOS implementations largely intact
   - Focus on adding Linux support with proper systemd integration
   - Create a unified API for service lifecycle management (install/uninstall/start/stop)

3. **Logging Framework**
   - Enhance the existing `tracing`-based logging with better platform-specific configuration
   - Standardize log fields and structure for better analysis
   - Include request/correlation IDs in logs to track related events
   - Ensure consistent file paths and permissions across platforms

4. **Permission Management**
   - Create a platform-agnostic API for permission checking
   - Implement platform-specific verification of root/admin privileges
   - Add runtime capability checks to ensure proper operation
   - Gracefully handle permission issues with clear user feedback

5. **Installation Workflow**
   - Create platform-specific installer packages
   - Use similar installation steps across platforms for consistency
   - Include proper service setup in installation process
   - Support both GUI and headless installation methods

6. **Testing & Validation**
   - Implement cross-platform testing framework
   - Create test matrices for all supported platforms
   - Automate testing where possible
   - Focus on testing critical paths first: service lifecycle, logging, and root execution

### Relevant Files

- `client/src/platform/directories.rs` - Platform-specific directory management (successfully refactored)
- `client/src/platform/permissions.rs` - Permission handling (needs cross-platform support)
- `client/src/service.rs` - Service implementation with platform-specific code
- `client/src/logging/mod.rs` - Main logging implementation
- `client/src/logging/platform.rs` - **Good example** of cross-platform path handling
- `client/Cargo.toml` - Dependencies management (contains platform-specific dependencies)
- `client/config/agent.toml` - Configuration template with some platform-specific settings 