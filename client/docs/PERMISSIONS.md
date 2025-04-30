# OpenFrame Agent Permissions Guide

## Overview

The OpenFrame agent requires specific directory permissions to function correctly. This guide explains the permission requirements, common issues, and how to resolve them.

## Directory Structure

The agent uses the following directories:

- `/Library/Logs/OpenFrame/` - For log files
- `/Library/Application Support/OpenFrame/` - For application data
- `/Library/Application Support/OpenFrame/run/` - For runtime files (PID files)

## Permission Requirements

### Directories
- All agent directories: `755` (drwxr-xr-x)
  - Owner: read, write, execute
  - Group: read, execute
  - Others: read, execute

### Files
- Log files: `644` (rw-r--r--)
  - Owner: read, write
  - Group: read
  - Others: read
- PID files: `644` (rw-r--r--)
  - Owner: read, write
  - Group: read
  - Others: read

## Automatic Permission Management

The OpenFrame agent includes automatic permission management that:

1. Creates required directories if they don't exist
2. Validates directory and file permissions on startup
3. Attempts to fix incorrect permissions automatically
4. Performs periodic permission checks during runtime

## Common Issues and Solutions

### Issue: Permission Denied Errors

If you see "Permission denied" errors in the logs:

1. Check the agent is running as root/administrator
2. Verify directory ownership:
   ```bash
   ls -la /Library/Logs/OpenFrame/
   ls -la "/Library/Application Support/OpenFrame/"
   ```
3. Fix permissions manually if needed:
   ```bash
   sudo chmod 755 /Library/Logs/OpenFrame/
   sudo chmod 755 "/Library/Application Support/OpenFrame/"
   sudo chmod 755 "/Library/Application Support/OpenFrame/run/"
   ```

### Issue: Cannot Create Directories

If the agent cannot create required directories:

1. Ensure parent directories exist
2. Check parent directory permissions
3. Verify the agent has sufficient privileges

## Monitoring and Troubleshooting

The agent logs permission-related events to:
- `/Library/Logs/OpenFrame/permissions.log`

Common log messages:
- `[INFO] Directory permissions validated successfully`
- `[WARN] Invalid permissions detected on directory`
- `[ERROR] Failed to fix permissions on directory`

## Security Considerations

1. Never set directory permissions to 777
2. Keep file permissions restricted to 644
3. Maintain proper ownership of directories
4. Regularly monitor permission changes

## Best Practices

1. Run the agent with appropriate privileges
2. Use the built-in permission management
3. Monitor permission-related logs
4. Perform regular permission audits
5. Follow the principle of least privilege

## Support

If you encounter persistent permission issues:

1. Check the permissions log file
2. Run the agent with debug logging enabled
3. Contact support with the log files
4. Include the output of permission checks 