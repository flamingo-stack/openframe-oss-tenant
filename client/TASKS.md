# OpenFrame macOS Root Install & Execution Fix

Brief description:  
This task list tracks the steps to ensure OpenFrame installs and runs as root on macOS, including correct installation of the app bundle, LaunchDaemon, and verification of root execution and permissions.

## Important Guidelines
- DO NOT use manual workarounds to solve installation issues
- All fixes MUST be implemented in the package installer itself
- Focus on making the PKG installer robust and self-contained
- Fix root causes, not symptoms

## Completed Tasks

- [x] Build OpenFrame package with `build-package.sh`
- [x] Install LaunchDaemon plist to `/Library/LaunchDaemons`
- [x] Create required log and support directories with root permissions
- [x] Fix postinstall script to remove application existence checks that caused installation failure (exit code 143)
- [x] Fix package structure to use productbuild for creating the installer
- [x] Implement correct component-based packaging with separate app and library components
- [x] Ensure component packages are properly copied to dist directory for productbuild
- [x] Fix distribution.xml to reference component packages correctly

## In Progress Tasks

- [x] Test package installer with pkgutil --expand to examine actual payload structure
- [x] Verify package structure contains both app and library components
- [x] Verify installation scripts (preinstall and postinstall) are correctly included in package
- [ ] Identify and fix root cause of installer termination with exit code 143
- [ ] Verify ownership and permissions in the package
- [ ] Ensure LaunchDaemon starts agent as root
- [ ] Verify agent can execute scripts as root
- [ ] Test agent process runs as root after install
- [ ] Test agent executes scripts as root

## Future Tasks

- [ ] Add automated test for root execution and permissions
- [ ] Improve installer robustness (add proper error handling)
- [ ] Update user documentation for macOS install
- [ ] Implement proper cleanup procedures for failed installations

## Implementation Plan

1. **Diagnose Installer Issues**
   - Current status: PKG installer terminates with exit code 143
   - Only LaunchDaemon is installed, application bundle is missing
   - Review actual package contents with pkgutil --expand
   - Verify source directory structure is correct
   - Examine the pkgbuild command parameters

2. **Fix Package Building Process**
   - Verify Applications directory is properly structured in payload
   - Consider using productbuild instead of pkgbuild for more control
   - Check if component inclusion needs to be explicitly defined
   - Examine file ownership in the package payload

3. **Verification**
   - Check agent process is running as root (using `ps` or `launchctl`)
   - Place a test script in the agent's working directory, have the agent execute it, and check if it runs as root
   - Use `productutil` to inspect the installed package and verify all files are present

4. **Automation & Documentation**
   - Script verification steps
   - Update documentation for future installations

### Relevant Files

- `client/scripts/build-package.sh` - Build and package script
- `client/scripts/pkg_scripts/postinstall` - Postinstall script (modified to use conditional checks)
- `/Library/LaunchDaemons/com.openframe.agent.plist` - LaunchDaemon config
- `/Applications/OpenFrame.app` - Main app bundle (should be installed)
- `/Library/Logs/OpenFrame/` - Log directory
- `/Library/Application Support/OpenFrame/` - Support directory 

## Important Implementation Note
DO NOT CREATE A WRAPPER SCRIPT as an installation method. The solution must fix the PKG installer itself to properly install all components directly. Focus on resolving the core packaging issues in build-package.sh and ensuring proper component inclusion through pkgbuild/productbuild. 

## Debugging Notes

- The package structure appears correct with app.pkg and library.pkg components
- Both preinstall and postinstall scripts are included and simplified
- Package components show correct install locations (/Applications for app.pkg, /Library for library.pkg)
- Installation still terminates with exit code 143, suggesting a deeper issue
- Potential areas to investigate:
  - Check system logs for errors during installation
  - Verify permissions on the target directories
  - Consider debugging installation process with sandbox or trace options 