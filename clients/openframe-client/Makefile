# Makefile for the OpenFrame client (thin binary over openframe-agent-lib)

CARGO ?= cargo
# Consumed by openframe-agent-lib's build script (build.rs panics if unset).
OPENFRAME_VERSION ?= 0.0.0-dev

# Optional target for cross-compilation
TARGET ?=
ifneq ($(TARGET),)
  TARGET_FLAG := --target $(TARGET)
endif

.PHONY: fmt fmt-check clippy lint build test clean

fmt:
	$(CARGO) fmt --all

fmt-check:
	$(CARGO) fmt --all -- --check

clippy:
	OPENFRAME_VERSION=$(OPENFRAME_VERSION) $(CARGO) clippy --all-targets -- -D warnings

lint: fmt-check clippy

build:
	OPENFRAME_VERSION=$(OPENFRAME_VERSION) $(CARGO) build --release --locked $(TARGET_FLAG)

test: build
	OPENFRAME_VERSION=$(OPENFRAME_VERSION) $(CARGO) test --release --locked

clean:
	$(CARGO) clean
