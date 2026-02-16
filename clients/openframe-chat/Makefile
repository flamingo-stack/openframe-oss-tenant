CARGO ?= cargo

# Optional target for cross-compilation
TARGET ?=
ifneq ($(TARGET),)
  TARGET_FLAG := --target $(TARGET)
endif

.PHONY: lint build build-dmg test fmt fmt-check clippy clean

fmt:
	cd src-tauri && $(CARGO) fmt --all

fmt-check:
	cd src-tauri && $(CARGO) fmt --all -- --check

clippy:
	cd src-tauri && $(CARGO) clippy --all-targets -- -D warnings

lint: fmt-check clippy

build:
	rm -rf node_modules package-lock.json
	npm install
	npx tauri build $(TARGET_FLAG) --no-bundle

# Build universal macOS .dmg (for CI release)
build-dmg:
	rm -rf node_modules package-lock.json
	npm install
	rustup target add aarch64-apple-darwin x86_64-apple-darwin 2>/dev/null || true
	npx tauri build --target universal-apple-darwin

test: build
	$(CARGO) tauri test

clean:
	$(CARGO) tauri clean
