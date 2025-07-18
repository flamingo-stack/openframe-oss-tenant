# OpenFrame CLI Makefile

BINARY_NAME=openframe
VERSION?=$(shell git describe --tags --always --dirty 2>/dev/null || echo "dev")
LDFLAGS=-ldflags "-X main.version=$(VERSION)"

.PHONY: all build clean install uninstall test test-unit test-integration test-e2e help

all: build

# Build the binary
build:
	@echo "Building $(BINARY_NAME)..."
	go build $(LDFLAGS) -o $(BINARY_NAME) .
	@echo "Build complete: $(BINARY_NAME)"

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	rm -f $(BINARY_NAME)
	@echo "Clean complete"

# Install binary to system
install: build
	@echo "Installing $(BINARY_NAME)..."
	@if [ ! -w /usr/local/bin ]; then \
		echo "Installing to /usr/local/bin (requires sudo)"; \
		sudo cp $(BINARY_NAME) /usr/local/bin/; \
		sudo chmod +x /usr/local/bin/$(BINARY_NAME); \
	else \
		echo "Installing to /usr/local/bin"; \
		cp $(BINARY_NAME) /usr/local/bin/; \
		chmod +x /usr/local/bin/$(BINARY_NAME); \
	fi
	@echo "Installation complete"

# Uninstall binary from system
uninstall:
	@echo "Uninstalling $(BINARY_NAME)..."
	@if [ -f /usr/local/bin/$(BINARY_NAME) ]; then \
		if [ ! -w /usr/local/bin ]; then \
			sudo rm -f /usr/local/bin/$(BINARY_NAME); \
		else \
			rm -f /usr/local/bin/$(BINARY_NAME); \
		fi; \
		echo "Uninstallation complete"; \
	else \
		echo "$(BINARY_NAME) not found in /usr/local/bin"; \
	fi

# Run unit tests only
test-unit:
	@echo "Running unit tests..."
	@go test -timeout=60s ./internal/app
	@go test -timeout=60s ./internal/config
	@go test -timeout=60s ./internal/utils
	@go test -timeout=60s ./cmd

# Run integration tests only
test-integration:
	@echo "Running integration tests..."
	@go test -timeout=120s ./tests/integration/...

# Run end-to-end tests only
test-e2e:
	@echo "Running end-to-end tests..."
	@go test -timeout=300s ./tests/e2e/...

# Run all tests
test:
	@$(MAKE) test-unit
	@$(MAKE) test-integration
	@$(MAKE) test-e2e
	@echo "All tests complete"

# Show help
help:
	@echo "OpenFrame CLI Build Commands:"
	@echo "  build        - Build the binary"
	@echo "  clean        - Clean build artifacts"
	@echo "  install      - Install binary to system"
	@echo "  uninstall    - Uninstall binary from system"
	@echo ""
	@echo "Testing:"
	@echo "  test         - Run all tests"
	@echo "  test-unit    - Run unit tests only"
	@echo "  test-integration - Run integration tests only"
	@echo "  test-e2e     - Run end-to-end tests only"
	@echo ""
	@echo "  help         - Show this help" 