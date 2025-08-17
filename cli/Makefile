# OpenFrame CLI Makefile

.PHONY: build clean test test-unit test-integration test-all test-pipeline install deps run help lint check dev

# Variables
BINARY_NAME=openframe
BUILD_DIR=build
VERSION=$(shell git describe --tags --exact-match 2>/dev/null || echo "dev")
COMMIT=$(shell git rev-parse --short HEAD 2>/dev/null || echo "unknown")
DATE=$(shell date -u +"%Y-%m-%d %H:%M:%S UTC")

# Build flags
LDFLAGS=-ldflags "-X 'github.com/flamingo/openframe/internal/cmd.version=$(VERSION)' -X 'github.com/flamingo/openframe/internal/cmd.commit=$(COMMIT)' -X 'github.com/flamingo/openframe/internal/cmd.date=$(DATE)'"

# Test output control
TEST_OUTPUT_FORMAT=dots

# Default target
all: build

## Install dependencies
deps:
	@echo "Installing dependencies..."
	@go mod tidy > /dev/null 2>&1
	@go mod download > /dev/null 2>&1
	@echo "Dependencies installed"
	
## Build the CLI binary
build: deps
	@echo "Building $(BINARY_NAME)..."
	@mkdir -p $(BUILD_DIR)
	@go build $(LDFLAGS) -o $(BUILD_DIR)/$(BINARY_NAME) . > /dev/null 2>&1
	@echo "Built $(BUILD_DIR)/$(BINARY_NAME)"

## Build for release (multiple platforms)
release: deps clean
	@echo "Building release binaries..."
	@mkdir -p $(BUILD_DIR)
	@echo "  - Building darwin/amd64..."
	@GOOS=darwin GOARCH=amd64 go build $(LDFLAGS) -o $(BUILD_DIR)/$(BINARY_NAME)-darwin-amd64 . > /dev/null 2>&1
	@echo "  - Building darwin/arm64..."
	@GOOS=darwin GOARCH=arm64 go build $(LDFLAGS) -o $(BUILD_DIR)/$(BINARY_NAME)-darwin-arm64 . > /dev/null 2>&1
	@echo "  - Building linux/amd64..."
	@GOOS=linux GOARCH=amd64 go build $(LDFLAGS) -o $(BUILD_DIR)/$(BINARY_NAME)-linux-amd64 . > /dev/null 2>&1
	@echo "  - Building linux/arm64..."
	@GOOS=linux GOARCH=arm64 go build $(LDFLAGS) -o $(BUILD_DIR)/$(BINARY_NAME)-linux-arm64 . > /dev/null 2>&1
	@echo "  - Building windows/amd64..."
	@GOOS=windows GOARCH=amd64 go build $(LDFLAGS) -o $(BUILD_DIR)/$(BINARY_NAME)-windows-amd64.exe . > /dev/null 2>&1
	@echo "Release binaries built in $(BUILD_DIR)/"

## Run unit tests (cmd and pkg packages) with clean output
test-unit:
	@echo "Running unit tests..."
	@if go test ./internal/... > /dev/null 2>&1; then \
		echo "Unit tests passed"; \
	else \
		echo "Unit tests failed"; \
		echo "Run 'go test -v ./internal/...' for details"; \
		exit 1; \
	fi

## Run integration tests with clean output
test-integration:
	@echo "Running integration tests..."
	@echo "No integration tests currently available - skipping"

## Run tests with coverage report
test-coverage:
	@echo "Running tests with coverage..."
	@go test -v -coverprofile=coverage.out ./... > /dev/null 2>&1
	@go tool cover -html=coverage.out -o coverage.html > /dev/null 2>&1
	@echo "Coverage report generated: coverage.html"

## Lint code (if golangci-lint is available)
lint:
	@echo "Running linters..."
	@if command -v golangci-lint > /dev/null 2>&1; then \
		if golangci-lint run > /dev/null 2>&1; then \
			echo "Linting passed"; \
		else \
			echo "Linting failed"; \
			echo "Run 'golangci-lint run' for details"; \
			exit 1; \
		fi \
	else \
		echo "WARNING: golangci-lint not found - skipping lint"; \
	fi

## Test CLI commands manually (smoke test)
test-cli: build
	@echo "Running CLI smoke tests..."
	@if ./$(BUILD_DIR)/$(BINARY_NAME) --help > /dev/null 2>&1 && \
	   ./$(BUILD_DIR)/$(BINARY_NAME) cluster --help > /dev/null 2>&1 && \
	   ./$(BUILD_DIR)/$(BINARY_NAME) cluster list > /dev/null 2>&1 && \
	   ./$(BUILD_DIR)/$(BINARY_NAME) cluster create --help > /dev/null 2>&1; then \
		echo "CLI smoke tests passed"; \
	else \
		echo "CLI smoke tests failed"; \
		exit 1; \
	fi

## Run comprehensive test pipeline (main test target)
test: build
	@echo "Running comprehensive test pipeline..."
	@echo ""
	@$(MAKE) --no-print-directory test-unit
	@$(MAKE) --no-print-directory test-integration  
	@$(MAKE) --no-print-directory test-cli
	@$(MAKE) --no-print-directory lint
	@echo ""
	@echo "Test pipeline completed successfully!"


## Install the CLI to GOPATH/bin
install: build
	@echo "Installing $(BINARY_NAME) to $(GOPATH)/bin..."
	@cp $(BUILD_DIR)/$(BINARY_NAME) $(GOPATH)/bin/
	@echo "Installed $(BINARY_NAME)"

## Run the CLI
run: build
	@./$(BUILD_DIR)/$(BINARY_NAME) --help

## Test CLI parameter validation
test-params: build
	@echo "Testing CLI parameters..."
	@if ./$(BUILD_DIR)/$(BINARY_NAME) cluster create --help > /dev/null 2>&1 && \
	   ./$(BUILD_DIR)/$(BINARY_NAME) cluster delete --help > /dev/null 2>&1 && \
	   ./$(BUILD_DIR)/$(BINARY_NAME) cluster status --help > /dev/null 2>&1 && \
	   ./$(BUILD_DIR)/$(BINARY_NAME) cluster list --help > /dev/null 2>&1; then \
		echo "Parameter validation tests passed"; \
	else \
		echo "Parameter validation tests failed"; \
		exit 1; \
	fi

## Test error handling
test-errors: build
	@echo "Testing error handling..."
	@error_count=0; \
	if ./$(BUILD_DIR)/$(BINARY_NAME) invalid-command > /dev/null 2>&1; then \
		echo "ERROR: Should fail on invalid command"; error_count=$$((error_count + 1)); \
	fi; \
	if ./$(BUILD_DIR)/$(BINARY_NAME) cluster status non-existent > /dev/null 2>&1; then \
		echo "ERROR: Should fail on non-existent cluster status"; error_count=$$((error_count + 1)); \
	fi; \
	if [ $$error_count -eq 0 ]; then \
		echo "Error handling tests passed"; \
	else \
		echo "Error handling tests failed ($$error_count failures)"; \
		exit 1; \
	fi

## Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	@rm -rf $(BUILD_DIR) > /dev/null 2>&1
	@rm -f coverage.out coverage.html > /dev/null 2>&1
	@rm -f test-openframe* > /dev/null 2>&1
	@echo "Cleaned"

## Development workflow (build, test, lint)
dev: clean build test-unit lint test-cli
	@echo "Development workflow completed successfully"

## Quick development check (fast)
check: build test-unit
	@echo "Quick check completed successfully"

## Verbose test run (shows all test output)
test-verbose:
	@echo "Running verbose tests..."
	@echo ""
	@echo "=== Unit Tests ==="
	@go test -v -short ./internal/...
	@echo ""
	@echo "=== All Tests ==="
	@go test -v ./...
	@echo ""
	@echo "Verbose test run completed"

## Show help
help:
	@echo "OpenFrame CLI - Available Make Targets:"
	@echo ""
	@grep -E '^## ' Makefile | sed 's/## /  /'
	@echo ""
	@echo "Common workflows:"
	@echo "  make test       # Full test pipeline (recommended)"
	@echo "  make build      # Build the CLI binary"
	@echo "  make dev        # Development workflow"
	@echo "  make check      # Quick development check"
	@echo "  make release    # Build release binaries"
	@echo "  make clean      # Clean build artifacts"