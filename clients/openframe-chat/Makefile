CARGO ?= cargo

# Optional target for cross-compilation
TARGET ?=
ifneq ($(TARGET),)
  TARGET_FLAG := --target $(TARGET)
endif

BUNDLES ?=
ifneq ($(BUNDLES),)
  BUNDLES_FLAG := --bundles $(BUNDLES)
endif

.PHONY: lint build test fmt fmt-check clippy clean

fmt:
	cd src-tauri && $(CARGO) fmt --all

fmt-check:
	cd src-tauri && $(CARGO) fmt --all -- --check

clippy:
	cd src-tauri && $(CARGO) clippy --all-targets -- -D warnings

lint: fmt-check clippy

build:
	rm -rf node_modules
	npm install
	npx tauri build $(TARGET_FLAG) $(BUNDLES_FLAG)

test: build
	$(CARGO) tauri test

clean:
	$(CARGO) tauri clean
