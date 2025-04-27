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

## In Progress Tasks

- [ ] Fix the package structure to properly install the app bundle (still missing after installation)
- [ ] Investigate why pkgbuild is not correctly including Application components
- [ ] Test package installer with pkgutil --expand to examine actual payload structure
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