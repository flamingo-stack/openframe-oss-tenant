# Makefile for OpenFrame OSS Rust project  

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
	$(CARGO) build --release --locked $(TARGET_FLAG)

test: build
	$(CARGO) test --release --locked

clean:
	$(CARGO) clean

# install cross tool
crossinstall:
	$(CARGO) install cross --git https://github.com/cross-rs/cross


crossbuild:
	cross build --release $(TARGET_FLAG)

