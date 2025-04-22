# Agent Permissions Fix Implementation

This task list outlines the plan to fix permissions issues with OpenFrame agent directories on macOS, specifically addressing PID and log directory creation and permissions. All permission handling will be done within the Rust code itself.

## Completed Tasks

- [x] Identify the core issue with directory permissions
- [x] Review current directory creation logic in platform module
- [x] Determine approach to handle permissions in Rust code
- [x] Create unified directory management module
- [x] Implement robust error handling for permission issues
- [x] Add comprehensive permission validation system
- [x] Add startup directory health check
- [x] Implement DirectoryManager with proper error handling
- [x] Add permission validation and fixing capabilities
- [x] Integrate directory checks into service startup
- [x] Implement monitoring for permission-related issues
- [x] Add telemetry for permission-related issues
- [x] Create admin tools for permission management

## In Progress Tasks

- [ ] Add automated tests for directory permissions
- [ ] Create user documentation for permissions

## Future Tasks

- [ ] Add periodic permission validation during runtime
- [ ] Implement automatic recovery strategies

## Implementation Details

### Current Implementation Status

1. Directory Management Module (`src/platform/directories.rs`) ✅
   ```rust
   pub struct DirectoryManager {
       logs_dir: PathBuf,
       app_support_dir: PathBuf,
       run_dir: PathBuf,
   }
   
   impl DirectoryManager {
       pub fn new() -> Self;
       pub fn perform_health_check(&self) -> Result<(), DirectoryError>;
       pub fn ensure_directories(&self) -> Result<(), DirectoryError>;
       pub fn validate_permissions(&self) -> Result<(), DirectoryError>;
       pub fn fix_permissions(&self) -> Result<(), DirectoryError>;
   }
   ```

2. Permission Management (`src/platform/permissions.rs`) ✅
   ```rust
   pub struct Permissions {
       pub mode: u32,
       pub uid: u32,
       pub gid: u32,
   }
   
   impl Permissions {
       pub fn new(mode: u32, uid: u32, gid: u32) -> Self;
       pub fn directory() -> Self;  // Standard directory permissions (755)
       pub fn file() -> Self;      // Standard file permissions (644)
       pub fn apply(&self, path: &Path) -> Result<(), PermissionError>;
       pub fn verify(&self, path: &Path) -> Result<bool, PermissionError>;
   }
   ```

3. Permission Monitoring (`src/monitoring/permissions.rs`) ✅
   ```rust
   pub struct PermissionMonitor {
       directory_manager: Arc<DirectoryManager>,
       check_interval: Duration,
       permission_errors: Counter,
       permission_fixes: Counter,
       last_check_timestamp: Gauge,
   }

   impl PermissionMonitor {
       pub fn new(directory_manager: Arc<DirectoryManager>) -> Self;
       pub fn with_interval(mut self, interval: Duration) -> Self;
       pub async fn start_monitoring(self);
       pub fn get_metrics(&self) -> Vec<(&str, f64)>;
   }
   ```

4. Error Handling Implementation ✅
   ```rust
   #[derive(Debug)]
   pub enum DirectoryError {
       CreateFailed(PathBuf, io::Error),
       PermissionDenied(PathBuf),
       ValidationFailed(PathBuf, String),
       FixFailed(PathBuf, String),
       OwnershipError(PathBuf, String),
   }
   ```

5. Service Integration ✅
   ```rust
   impl Service {
       pub async fn run() -> Result<()> {
           let dir_manager = DirectoryManager::new();
           dir_manager.perform_health_check()?;
           // ... rest of service initialization
       }
   }
   ```

### Directory Structure and Permissions

All directories are now properly managed with the following permissions:
- `/Library/Logs/OpenFrame/`: 755 (drwxr-xr-x)
- `/Library/Application Support/OpenFrame/`: 755 (drwxr-xr-x)
- `/Library/Application Support/OpenFrame/run/`: 755 (drwxr-xr-x)

File permissions are enforced as:
- Log files: 644 (-rw-r--r--)
- PID file: 644 (-rw-r--r--)

### Testing Status

1. Unit Tests (Partially Complete)
   - ✅ Directory creation tests
   - ✅ Basic permission verification
   - ✅ Error handling tests
   - ⏳ Recovery procedure tests (In Progress)

2. Integration Tests (In Progress)
   - ✅ Startup sequence tests
   - ⏳ Permission change tests
   - ⏳ Error condition tests

3. Platform-specific Tests (Planned)
   - ⏳ macOS-specific permission scenarios
   - ⏳ Different user contexts

### Next Steps

1. Complete remaining test implementations
2. Add comprehensive logging for permission operations
3. Create user documentation for permission management

### Technical Notes

1. All directory and permission operations are now handled using Rust's standard library
2. No external scripts or commands are used
3. Comprehensive error handling and logging is implemented
4. Graceful degradation when running without elevated privileges
5. Clear error messages guide users to run with proper permissions
6. Monitoring system tracks permission-related metrics and issues
7. Automatic permission fixes are implemented with proper error handling

### Implementation Plan

### Directory Structure
The agent requires several critical directories with specific permissions:
- `/Library/Logs/OpenFrame/` (logs directory)
- `/Library/Application Support/OpenFrame/` (application data)
  - `run/` (for PID and runtime files)

### Permission Requirements
1. Logs directory: 755 (drwxr-xr-x)
2. Application Support directory: 755 (drwxr-xr-x)
3. Run directory: 755 (drwxr-xr-x)
4. Log files: 644 (-rw-r--r--)
5. PID file: 644 (-rw-r--r--)

### Implementation Details

1. Directory Management Module (`src/platform/directories.rs`)
   ```rust
   pub struct DirectoryManager {
       base_dir: PathBuf,
       log_dir: PathBuf,
       run_dir: PathBuf,
   }
   
   impl DirectoryManager {
       pub fn new() -> Self;
       pub fn ensure_directories(&self) -> Result<(), Error>;
       pub fn validate_permissions(&self) -> Result<(), Error>;
       pub fn fix_permissions(&self) -> Result<(), Error>;
   }
   ```

2. Permission Management (`src/platform/permissions.rs`)
   ```rust
   pub struct Permissions {
       pub mode: u32,
       pub user: String,
       pub group: String,
   }
   
   impl Permissions {
       pub fn apply(&self, path: &Path) -> Result<(), Error>;
       pub fn verify(&self, path: &Path) -> Result<bool, Error>;
   }
   ```

3. Startup Health Check
   ```rust
   pub fn perform_startup_check() -> Result<(), Error> {
       // Verify all required directories exist
       // Verify all permissions are correct
       // Fix any issues found
       // Return detailed error if cannot fix
   }
   ```

### Error Handling Strategy

1. Custom Error Types
   ```rust
   #[derive(Debug)]
   pub enum DirectoryError {
       CreateFailed(PathBuf, std::io::Error),
       PermissionDenied(PathBuf),
       ValidationFailed(PathBuf, String),
       FixFailed(PathBuf, String),
   }
   ```

2. Recovery Procedures
   - Attempt to create missing directories with correct permissions
   - Attempt to fix incorrect permissions
   - Provide detailed error messages for manual intervention

### Relevant Files

- `agent/src/platform/directories.rs` - New directory management module
- `agent/src/platform/permissions.rs` - New permissions management module
- `agent/src/logging/mod.rs` - Logging setup using new directory management
- `agent/src/main.rs` - Startup health check implementation

### Technical Notes

1. All directory and permission operations will be handled using Rust's standard library and platform-specific APIs
2. No reliance on external scripts or commands
3. Proper error handling and logging for all operations
4. Graceful degradation when running without elevated privileges
5. Clear error messages directing users to run with proper permissions

### Testing Strategy

1. Unit Tests
   - Directory creation
   - Permission verification
   - Error handling
   - Recovery procedures

2. Integration Tests
   - Full startup sequence
   - Permission changes
   - Error conditions

3. Platform-specific Tests
   - macOS-specific permission scenarios
   - Different user contexts 