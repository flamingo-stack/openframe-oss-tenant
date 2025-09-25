# OpenFrame CLI Makefile

.PHONY: build clean test test-unit test-integration test-all help

# Variables
BINARY_NAME=openframe
BUILD_DIR=build

# Default target
all: build

## Build the CLI binary
build:
	@echo "Building $(BINARY_NAME)..."
	@GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -o $(BINARY_NAME)-linux-amd64 .
	@GOOS=darwin GOARCH=arm64 CGO_ENABLED=0 go build -o $(BINARY_NAME) .
	@GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -o $(BINARY_NAME)-windows-amd64.exe .
	@echo "Built ./$(BINARY_NAME)-linux-amd64 ./$(BINARY_NAME) and ./$(BINARY_NAME)-windows-amd64.exe"

## Run unit tests
test-unit:
	@echo "Running unit tests..."
	@go test -vet=off ./cmd/... ./internal/...

## Run integration tests  
test-integration:
	@echo "Running integration tests..."
	@go test ./tests/integration/...

## Run all tests
test-all: test-unit test-integration

## Run tests (default)
test: test-all


## Clean build artifacts
clean:
	@rm -rf $(BUILD_DIR)
	@rm -f $(BINARY_NAME)
	@echo "Cleaned build artifacts"

## Show help
help:
	@echo "Available targets:"
	@echo "  build           - Build the CLI binary"
	@echo "  test-unit       - Run unit tests"
	@echo "  test-integration - Run integration tests"
	@echo "  test-all        - Run all tests"
	@echo "  test            - Run all tests (default)"
	@echo "  clean           - Clean build artifacts"