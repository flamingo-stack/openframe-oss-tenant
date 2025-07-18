# OpenFrame CLI Testing

This directory contains the organized test structure for the OpenFrame CLI application.

## Test Organization

### Unit Tests
- **Location**: Co-located with source code (e.g., `main_test.go`, `cmd/root_test.go`)
- **Purpose**: Test individual functions and methods in isolation
- **Scope**: Fast, focused tests that don't require external dependencies
- **Run with**: `make test-unit` or `go test ./...`

### Integration Tests
- **Location**: `tests/integration/`
- **Purpose**: Test component interactions and CLI command behavior
- **Scope**: Tests that require building the CLI but may not need full environment
- **Run with**: `make test-integration` or `go test ./tests/integration/...`

### End-to-End Tests
- **Location**: `tests/e2e/`
- **Purpose**: Test complete workflows and real-world usage scenarios
- **Scope**: Full application testing that may require Kubernetes cluster
- **Run with**: `make test-e2e` or `go test ./tests/e2e/...`

## Running Tests

### Quick Development
```bash
# Run only unit tests (fastest)
make test-unit

# Run integration tests
make test-integration

# Run end-to-end tests
make test-e2e
```

### Comprehensive Testing
```bash
# Run all test types
make test-all

# Run with coverage
make test-coverage

# Run with race detection
make test-race
```

### Specific Test Suites
```bash
# Test specific packages
make test-main
make test-cmd
make test-app
make test-config
make test-utils
```

## Test Guidelines

### Unit Tests
- Keep tests fast and focused
- Mock external dependencies
- Test edge cases and error conditions
- Use descriptive test names

### Integration Tests
- Test command-line interface behavior
- Verify output format and content
- Test flag combinations
- Mock external tools when possible

### End-to-End Tests
- Test complete workflows
- May require real Kubernetes cluster
- Use `testing.Short()` to skip in CI
- Focus on user scenarios

## Test Dependencies

### Required Tools
- Go 1.21+
- kubectl (for e2e tests)
- telepresence (for e2e tests)
- skaffold (for e2e tests)

### Optional Tools
- golangci-lint (for linting)
- godoc (for documentation)

## Continuous Integration

The test suite is designed to work in CI environments:

- Unit tests run in all environments
- Integration tests run in most environments
- E2E tests run only in environments with Kubernetes access

Use `testing.Short()` to skip expensive tests in CI:

```go
func TestExpensiveOperation(t *testing.T) {
    if testing.Short() {
        t.Skip("Skipping expensive test in short mode")
    }
    // ... test implementation
}
```

## Coverage

Generate coverage reports:

```bash
make test-coverage
```

This creates:
- `coverage.out` - Raw coverage data
- `coverage.html` - HTML coverage report

## Best Practices

1. **Test Naming**: Use descriptive names that explain what is being tested
2. **Test Organization**: Group related tests using `t.Run()`
3. **Error Messages**: Provide clear error messages that help debug failures
4. **Test Data**: Use fixtures and test data files for complex scenarios
5. **Cleanup**: Always clean up resources created during tests
6. **Parallel Testing**: Use `t.Parallel()` for independent tests when appropriate 