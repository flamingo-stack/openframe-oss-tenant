CARGO ?= cargo

# Optional target for cross-compilation
TARGET ?= 
ifneq ($(TARGET),)
  TARGET_FLAG := --target $(TARGET)
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
	rm -rf node_modules package-lock.json
	npm install 
	npm run prebuild
	cargo install tauri-cli
	$(CARGO) tauri build $(TARGET_FLAG)

test: build
	$(CARGO) tauri test

clean:
	$(CARGO) tauri clean
