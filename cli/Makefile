# OpenFrame CLI Makefile

.PHONY: build clean test install deps run help dev release

# Variables
BINARY_NAME=openframe
GO_FILES=$(shell find . -name "*.go" -type f)
BUILD_DIR=build
VERSION=$(shell git describe --tags --exact-match 2>/dev/null || echo "dev")
COMMIT=$(shell git rev-parse --short HEAD)
DATE=$(shell date -u '+%Y-%m-%d_%H:%M:%S')

# Build flags
LDFLAGS=-ldflags "-X main.version=$(VERSION) -X main.commit=$(COMMIT) -X main.date=$(DATE)"

# Default target
all: build

## Build the CLI binary
build: deps
	@echo "Building $(BINARY_NAME)..."
	@mkdir -p $(BUILD_DIR)
	@go build $(LDFLAGS) -o $(BUILD_DIR)/$(BINARY_NAME) .
	@echo "✅ Built $(BUILD_DIR)/$(BINARY_NAME)"

## Build for multiple platforms
build-all: deps
	@echo "Building for multiple platforms..."
	@mkdir -p $(BUILD_DIR)
	
	# macOS
	@GOOS=darwin GOARCH=amd64 go build $(LDFLAGS) -o $(BUILD_DIR)/$(BINARY_NAME)-darwin-amd64 .
	@GOOS=darwin GOARCH=arm64 go build $(LDFLAGS) -o $(BUILD_DIR)/$(BINARY_NAME)-darwin-arm64 .
	
	# Linux
	@GOOS=linux GOARCH=amd64 go build $(LDFLAGS) -o $(BUILD_DIR)/$(BINARY_NAME)-linux-amd64 .
	@GOOS=linux GOARCH=arm64 go build $(LDFLAGS) -o $(BUILD_DIR)/$(BINARY_NAME)-linux-arm64 .
	
	# Windows
	@GOOS=windows GOARCH=amd64 go build $(LDFLAGS) -o $(BUILD_DIR)/$(BINARY_NAME)-windows-amd64.exe .
	
	@echo "✅ Built binaries for all platforms in $(BUILD_DIR)/"

## Install dependencies
deps:
	@echo "Installing dependencies..."
	@go mod tidy
	@go mod download
	@echo "✅ Dependencies installed"

## Run tests
test:
	@echo "Running tests..."
	@go test -v ./...
	@echo "✅ Tests completed"

## Run tests with coverage
test-coverage:
	@echo "Running tests with coverage..."
	@go test -v -coverprofile=coverage.out ./...
	@go tool cover -html=coverage.out -o coverage.html
	@echo "✅ Coverage report generated: coverage.html"

## Install the CLI to GOPATH/bin
install: build
	@echo "Installing $(BINARY_NAME) to $(GOPATH)/bin..."
	@cp $(BUILD_DIR)/$(BINARY_NAME) $(GOPATH)/bin/
	@echo "✅ Installed $(BINARY_NAME)"

## Install the CLI to /usr/local/bin (requires sudo)
install-system: build
	@echo "Installing $(BINARY_NAME) to /usr/local/bin..."
	@sudo cp $(BUILD_DIR)/$(BINARY_NAME) /usr/local/bin/
	@echo "✅ Installed $(BINARY_NAME) system-wide"

## Run the CLI in development mode
dev: build
	@./$(BUILD_DIR)/$(BINARY_NAME) --help

## Run with sample commands
demo: build
	@echo "🚀 Running OpenFrame CLI demo..."
	@echo ""
	@echo "1. Showing help:"
	@./$(BUILD_DIR)/$(BINARY_NAME) --help
	@echo ""
	@echo "2. Showing cluster commands:"
	@./$(BUILD_DIR)/$(BINARY_NAME) cluster --help
	@echo ""
	@echo "3. Showing dev commands:"
	@./$(BUILD_DIR)/$(BINARY_NAME) dev --help

## Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	@rm -rf $(BUILD_DIR)
	@rm -f coverage.out coverage.html
	@echo "✅ Cleaned"

## Format Go code
fmt:
	@echo "Formatting Go code..."
	@go fmt ./...
	@echo "✅ Code formatted"

## Lint Go code
lint:
	@echo "Linting Go code..."
	@golangci-lint run
	@echo "✅ Linting completed"

## Run security scan
security:
	@echo "Running security scan..."
	@gosec ./...
	@echo "✅ Security scan completed"

## Generate documentation
docs:
	@echo "Generating documentation..."
	@mkdir -p docs
	@go run . docs --dir docs/
	@echo "✅ Documentation generated in docs/"

## Create release archives
release: clean build-all
	@echo "Creating release archives..."
	@mkdir -p releases
	
	# macOS
	@tar -czf releases/$(BINARY_NAME)-$(VERSION)-darwin-amd64.tar.gz -C $(BUILD_DIR) $(BINARY_NAME)-darwin-amd64
	@tar -czf releases/$(BINARY_NAME)-$(VERSION)-darwin-arm64.tar.gz -C $(BUILD_DIR) $(BINARY_NAME)-darwin-arm64
	
	# Linux  
	@tar -czf releases/$(BINARY_NAME)-$(VERSION)-linux-amd64.tar.gz -C $(BUILD_DIR) $(BINARY_NAME)-linux-amd64
	@tar -czf releases/$(BINARY_NAME)-$(VERSION)-linux-arm64.tar.gz -C $(BUILD_DIR) $(BINARY_NAME)-linux-arm64
	
	# Windows
	@zip -j releases/$(BINARY_NAME)-$(VERSION)-windows-amd64.zip $(BUILD_DIR)/$(BINARY_NAME)-windows-amd64.exe
	
	@echo "✅ Release archives created in releases/"

## Quick development workflow
quick: clean build test
	@echo "✅ Quick build and test completed"

## Full CI workflow
ci: clean deps fmt lint security test build-all
	@echo "✅ Full CI workflow completed"

## Show available make targets
help:
	@echo "OpenFrame CLI - Available Make Targets:"
	@echo ""
	@grep -E '^## ' Makefile | sed 's/## /  /'
	@echo ""
	@echo "Examples:"
	@echo "  make build          # Build the CLI"
	@echo "  make install        # Build and install to GOPATH"
	@echo "  make demo           # Run demo commands"
	@echo "  make ci             # Full CI workflow"

# Dependency checks
check-deps:
	@echo "Checking required dependencies..."
	@command -v go >/dev/null 2>&1 || { echo "❌ Go is required but not installed"; exit 1; }
	@command -v git >/dev/null 2>&1 || { echo "❌ Git is required but not installed"; exit 1; }
	@echo "✅ Required dependencies found"

# Docker build
docker-build:
	@echo "Building Docker image..."
	@docker build -t openframe-cli:$(VERSION) .
	@echo "✅ Docker image built: openframe-cli:$(VERSION)"

# Update version in main.go
update-version:
	@echo "Updating version variables..."
	@sed -i.bak 's/version = ".*"/version = "$(VERSION)"/' cmd/root.go
	@rm cmd/root.go.bak
	@echo "✅ Version updated to $(VERSION)"