# Makefile for Rust project

CARGO ?= cargo

# Optional target for cross-compilation
TARGET ?= 
ifneq ($(TARGET),)
  TARGET_FLAG := --target $(TARGET)
endif

.PHONY: lint build test fmt fmt-check clippy clean crossinstall crossbuild

fmt:
	$(CARGO) fmt --all

fmt-check:
	$(CARGO) fmt --all -- --check

clippy:
	$(CARGO) clippy --all-targets -- -D warnings

lint: fmt-check clippy

build:
	$(CARGO) build --release --locked

test: build
	$(CARGO) test --release --locked

clean:
	$(CARGO) clean

# install build tools
crossinstall:
	$(CARGO) install cross --git https://github.com/cross-rs/cross
	$(CARGO) install cargo-zigbuild

# Smart cross-compilation that picks the right tool
crossbuild:
	@if echo "$(TARGET)" | grep -q "apple-darwin"; then \
		echo "Building for macOS using zigbuild..."; \
		cargo zigbuild --release $(TARGET_FLAG); \
	else \
		echo "Building using cross..."; \
		cross build --release $(TARGET_FLAG); \
	fi