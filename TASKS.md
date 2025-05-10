# OpenFrame Windows Setup Fixes

This task list tracks the fixes needed for OpenFrame setup on Windows, specifically addressing Hyper-V and related configuration issues.

## Current Issues
- CPU Virtualization is disabled in BIOS
- Hyper-V module not found
- Virtual switch configuration failing
- Network adapter setup incomplete
- Hyper-V services not running (pending restart)

## Completed Tasks

- [x] Initial error analysis and task list creation
- [x] Run diagnostic script to identify issues
- [x] Enable Hyper-V Windows features (pending restart)

## In Progress Tasks

- [ ] System Restart Required
  1. Save all work
  2. Restart computer to complete Hyper-V installation
  3. Verify Hyper-V services after restart

- [ ] Enable CPU Virtualization in BIOS
  1. After restart, enter BIOS/UEFI settings
  2. Look for "Virtualization Technology" or "VT-x" setting
  3. Enable the setting
  4. Save and exit BIOS

- [ ] Configure network adapter settings
  1. Verify Hyper-V network adapter creation
  2. Configure IP settings for OpenFrameSwitch
  3. Test network connectivity

- [ ] Verify Docker Desktop configuration
  1. Check WSL2 integration
  2. Ensure Docker service is running
  3. Test Docker functionality

## Future Tasks

- [ ] Document Windows-specific setup requirements
- [ ] Create troubleshooting guide for common Windows issues

## Implementation Plan

### 1. Complete Hyper-V Installation
- Restart system to complete Hyper-V feature installation
- Verify Hyper-V services are running after restart

### 2. BIOS Configuration
- Enter BIOS/UEFI after restart
- Enable CPU Virtualization
- Save changes and restart again

### 3. Network Configuration
- Create OpenFrameSwitch
- Configure IP settings
- Test network connectivity

### 4. Docker Configuration
- Verify Docker Desktop installation
- Check WSL2 integration
- Test Docker functionality

### Relevant Files
- `scripts/run-windows.ps1` - Main Windows setup script
- `scripts/diagnose-hyperv.ps1` - Diagnostic script
- `scripts/enable-hyperv.ps1` - Hyper-V enablement script
- `TASKS.md` - This task tracking file 