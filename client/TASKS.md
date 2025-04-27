# OpenFrame macOS Root Install & Execution Fix

Brief description:  
This task list tracks the steps to ensure OpenFrame installs and runs as root on macOS, including correct installation of the app bundle, LaunchDaemon, and verification of root execution and permissions.

## Completed Tasks

- [x] Build OpenFrame package with `build-package.sh`
- [x] Install LaunchDaemon plist to `/Library/LaunchDaemons`
- [x] Create required log and support directories with root permissions

## In Progress Tasks

- [ ] Fix incomplete installation of `/Applications/OpenFrame.app`
- [ ] Ensure LaunchDaemon starts agent as root
- [ ] Verify agent can execute scripts as root
- [ ] Test agent process runs as root after install
- [ ] Test agent executes scripts as root
- [ ] Test use of `productutil` for package inspection instead of `pkgutil`
- [ ] Document and automate verification steps

## Future Tasks

- [ ] Add automated test for root execution and permissions
- [ ] Improve installer robustness (handle partial installs, cleanup)
- [ ] Update user documentation for macOS install

## Implementation Plan

1. **Diagnose Installer Failure**
   - Review `/var/log/install.log` for errors
   - Identify why `/Applications/OpenFrame.app` is missing

2. **Manual Recovery (if needed)**
   - Manually copy `OpenFrame.app` to `/Applications` as root
   - Reload LaunchDaemon

3. **Verification**
   - Check agent process is running as root (using `ps` or `launchctl`)
   - Place a test script in the agent's working directory, have the agent execute it, and check if it runs as root (e.g., writes a file only root can)
   - Test agent executes scripts as root
   - Use `productutil` to inspect the installed package and verify all files are present

4. **Automation & Documentation**
   - Script verification steps
   - Update documentation for future installs

### Relevant Files

- `client/scripts/build-package.sh` - Build and package script
- `/Library/LaunchDaemons/com.openframe.agent.plist` - LaunchDaemon config
- `/Applications/OpenFrame.app` - Main app bundle (should be installed)
- `/Library/Logs/OpenFrame/` - Log directory
- `/Library/Application Support/OpenFrame/` - Support directory 