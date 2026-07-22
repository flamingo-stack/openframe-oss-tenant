CARGO ?= cargo
OPENFRAME_VERSION ?= 0.0.0-dev

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
	OPENFRAME_UPDATER_VERSION=$(OPENFRAME_VERSION) $(CARGO) clippy --all-targets -- -D warnings

lint: fmt-check clippy

build:
	OPENFRAME_UPDATER_VERSION=$(OPENFRAME_VERSION) $(CARGO) build --release --locked $(TARGET_FLAG)

test: build
	OPENFRAME_UPDATER_VERSION=$(OPENFRAME_VERSION) $(CARGO) test --release --locked

clean:
	$(CARGO) clean
