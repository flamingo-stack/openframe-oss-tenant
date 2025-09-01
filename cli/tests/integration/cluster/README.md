# Cluster Integration Tests

## Overview
Simplified, fast, and reliable integration tests for cluster operations. Tests are organized into a single comprehensive test file with optimized execution patterns.

## Test Structure

### Files
- `cluster_test.go` - Main test file with all cluster functionality tests
- `helpers_test.go` - Test utilities and helper functions  
- `main_test.go` - Test setup and teardown

### Test Functions

#### 🚀 Fast Tests (< 2 seconds)
- `TestValidation` - Command validation without cluster creation (~0.5s)
- `TestDryRunOperations` - Dry-run functionality testing (~0.2s)  
- `TestEmptyList` - List command with no clusters (~0.1s)

#### 🏗️ Comprehensive Test (< 40 seconds)
- `TestClusterOperations` - Complete cluster lifecycle with retry logic

## Execution Options

### Super Fast (< 2 seconds)
```bash
go test -v ./tests/integration/cluster/... -short -timeout=30s
```
Runs only validation and dry-run tests, skips actual cluster creation.

### Full Suite (< 40 seconds) 
```bash
go test -v ./tests/integration/cluster/... -timeout=5m
```
Runs all tests including actual cluster creation and operations.

### Specific Tests
```bash
# Only validation tests
go test -v ./tests/integration/cluster/... -run="TestValidation" -timeout=30s

# Only cluster operations  
go test -v ./tests/integration/cluster/... -run="TestClusterOperations" -timeout=5m

# Only dry-run tests
go test -v ./tests/integration/cluster/... -run="TestDryRunOperations" -timeout=30s
```

## Test Flow

### TestClusterOperations Sequential Flow
1. **Phase 1**: Create cluster (with 3-attempt retry logic)
2. **Phase 2**: Test status commands (basic and verbose)
3. **Phase 3**: Test list commands (default, quiet, verbose)  
4. **Phase 4**: Test cleanup command (non-destructive)
5. **Phase 5**: Test idempotent operations (multiple calls)
6. **Phase 6**: Delete cluster
7. **Phase 7**: Test error handling on deleted cluster

## Key Optimizations

### Speed Improvements
- **Single cluster lifecycle**: All operations tested on one cluster
- **Retry logic**: 3 attempts with progressive backoff for cluster creation
- **Minimal wait times**: 500ms delays instead of 1-2 seconds
- **Fast validation**: No cluster creation for validation tests
- **Dry-run testing**: Configuration validation without resource overhead

### Reliability Improvements  
- **Dependency checks**: Verify Docker/k3d before running tests
- **Better cleanup**: Automatic cleanup on test exit
- **Progressive backoff**: Retry failed operations with increasing delays
- **Error isolation**: Failed cluster creation doesn't block validation tests

### Resource Efficiency
- **Single-node clusters**: Always use `--nodes 1` 
- **Shared cluster**: Reuse cluster across test phases
- **Targeted cleanup**: Only clean test-specific resources

## Performance Targets

| Test Type | Target Time | Actual Time |
|-----------|-------------|-------------|
| Fast validation | < 2 seconds | ~0.7 seconds |
| Dry-run operations | < 30 seconds | ~0.2 seconds |
| Full cluster lifecycle | < 2 minutes | ~37 seconds |
| Complete test suite | < 5 minutes | ~39 seconds |

## Dependencies

### Required
- Docker (for k3d)
- k3d (for Kubernetes clusters)
- Go test environment

### Optional
- `-short` flag: Skip cluster creation for faster CI runs
- `-timeout`: Adjust timeout based on environment speed

## Troubleshooting

### Cluster Creation Failures
The test includes retry logic for cluster creation. If all 3 attempts fail:
1. Check Docker is running
2. Check k3d is installed and accessible  
3. Check available system resources
4. Check for port conflicts

### Fast Tests Only
If you only need validation without cluster creation:
```bash
go test -v ./tests/integration/cluster/... -short
```

This will run validation tests while skipping resource-intensive cluster operations.

## Migration from Old Structure

This simplified structure replaces the previous 9-file structure:
- ❌ Removed: `advanced_test.go`, `core_test.go`, `performance_test.go`, `quick_test.go`, `sequential_test.go`, `suite_test.go`, `validation_test.go`
- ✅ Consolidated into: `cluster_test.go` (single comprehensive file)
- 🚀 Result: 25 scattered test functions → 4 focused test functions
- ⚡ Speed: 11+ minutes → under 40 seconds for full suite