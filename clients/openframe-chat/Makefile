CARGO ?= cargo

# Optional target for cross-compilation
TARGET ?= 
ifneq ($(TARGET),)
  TARGET_FLAG := --target $(TARGET)
endif

.PHONY: lint build build-app build-pkg build-zip test fmt fmt-check clippy clean clean-pkg clean-zip

# Linting targets
fmt:
	cd src-tauri && $(CARGO) fmt --all

fmt-check:
	cd src-tauri && $(CARGO) fmt --all -- --check

clippy:
	cd src-tauri && $(CARGO) clippy --all-targets -- -D warnings

lint: fmt-check clippy

# Build targets
build:
	rm -rf node_modules package-lock.json
	npm install 
	npm run prebuild
	cargo install tauri-cli
	$(CARGO) tauri build $(TARGET_FLAG)

build-app:
	@echo "Installing dependencies..."
	npm install
	@echo "Building frontend..."
	npm run build
	@echo "Building Tauri .app bundle..."
	npm run tauri build -- --bundles app
	@echo "✅ .app bundle created successfully!"
	@echo "📦 Location: src-tauri/target/release/bundle/macos/OpenFrame Chat.app"

# Build .pkg installer for distribution
build-pkg: build-app
	@echo "Creating .pkg installer for distribution..."
	@mkdir -p src-tauri/target/release/bundle/macos/pkg-root/Applications
	@cp -R "src-tauri/target/release/bundle/macos/OpenFrame Chat.app" \
		src-tauri/target/release/bundle/macos/pkg-root/Applications/
	@pkgbuild \
		--root src-tauri/target/release/bundle/macos/pkg-root \
		--identifier com.openframe.chat \
		--version 0.1.0 \
		--install-location / \
		src-tauri/target/release/bundle/macos/OpenFrame-Chat-0.1.0-macos-aarch64.pkg
	@rm -rf src-tauri/target/release/bundle/macos/pkg-root
	@echo "✅ .pkg installer created successfully!"
	@echo "📦 Location: src-tauri/target/release/bundle/macos/OpenFrame-Chat-0.1.0-macos-aarch64.pkg"
	@echo ""
	@echo "To install silently: sudo installer -pkg OpenFrame-Chat-0.1.0-macos-aarch64.pkg -target /"

# Build .zip archive for distribution
build-zip: build-app
	@echo "Creating .zip archive from .app bundle..."
	@cd src-tauri/target/release/bundle/macos && \
		zip -r -y "OpenFrame-Chat-0.1.0-macos-aarch64.zip" "OpenFrame Chat.app"
	@echo "✅ .zip archive created successfully!"
	@echo "📦 Location: src-tauri/target/release/bundle/macos/OpenFrame-Chat-0.1.0-macos-aarch64.zip"

# Test targets
test: build
	$(CARGO) tauri test

# Clean targets
clean:
	$(CARGO) tauri clean

clean-pkg:
	@echo "Cleaning .pkg artifacts..."
	@rm -rf src-tauri/target/release/bundle/macos/pkg-root
	@rm -f src-tauri/target/release/bundle/macos/*.pkg
	@echo "✅ Cleaned"

clean-zip:
	@echo "Cleaning .zip artifacts..."
	@rm -f src-tauri/target/release/bundle/macos/*.zip
	@echo "✅ Cleaned"
