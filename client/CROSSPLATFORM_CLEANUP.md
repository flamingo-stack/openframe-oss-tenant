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

## In Progress Tasks

- [ ] Research and select a cross-platform service management library
  - Evaluate existing usage of `daemonize` for Unix and `windows-service` for Windows
  - Consider using `service-manager` crate that supports Windows Service, Launchd (macOS), systemd and other service managers
  - Aim for a minimal adapter pattern rather than a full replacement of existing code

- [ ] Enhance logging framework for cross-platform consistency
  - Update logging module to use the improved DirectoryManager exclusively
  - Consolidate the overlapping functionality in `logging/platform.rs` and `platform/directories.rs`
  - Ensure consistent log file handling across platforms
  - Add better error handling for permission issues when writing logs

- [ ] Identify and list all code that is not cross-platform or is obsolete
  - Service implementation has platform-specific branches
  - Installation scripts only support macOS
  - **GOOD NEWS**: `logging/platform.rs` already has proper cross-platform support

## Future Tasks

- [ ] Implement cross-platform service management
  - Use a lightweight adapter pattern to maintain existing code where possible
  - For Windows: enhance existing `windows-service` implementation
  - For Linux: support both systemd and init.d scripts
  - For macOS: maintain current LaunchDaemon approach
  - Add proper support for automated installation/uninstallation on all platforms

- [ ] Create platform-specific installation packages
  - Windows: Create MSI installer
  - Linux: Create DEB and RPM packages
  - macOS: Maintain current PKG installer
  - Include pre/post installation scripts for proper service setup

- [ ] Implement and test root/admin execution on all platforms
  - Windows: Ensure proper UAC handling and service elevation
  - Linux: Implement sudo or polkit integration with proper permissions
  - macOS: Maintain current root execution approach
  - Add capability check on startup to verify permissions

- [ ] Add automated tests for service management, logging, and root execution
  - Create tests that can run on all platforms
  - Implement platform-specific test cases where needed
  - Add CI workflow to test each platform

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
- `client/scripts/build-package.sh` - macOS package building (need Windows/Linux equivalents)
- `client/scripts/pkg_scripts/` - macOS installation scripts (need Windows/Linux equivalents)
- `client/Cargo.toml` - Dependencies management (contains platform-specific dependencies)
- `client/config/agent.toml` - Configuration template with some platform-specific settings 