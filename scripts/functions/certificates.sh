#!/bin/bash

set -euo pipefail

readonly CERT_DIR="$HOME/.openframe-certs"

# Install mkcert if not available
install_mkcert() {
  if command -v mkcert >/dev/null 2>&1; then
    return 0
  fi

  echo "Installing mkcert..."
  case "$OSTYPE" in
    darwin*)
      if ! command -v brew >/dev/null 2>&1; then
        echo "Error: brew required to install mkcert on macOS" >&2
        return 1
      fi
      brew install mkcert
      ;;
    linux*)
      local bin_dir="$HOME/bin"
      mkdir -p "$bin_dir"
      curl -fsSL -o "$bin_dir/mkcert" "https://dl.filippo.io/mkcert/latest?for=linux/amd64"
      chmod +x "$bin_dir/mkcert"
      export PATH="$bin_dir:$PATH"
      ;;
    *)
      echo "Error: Unsupported OS. Install mkcert manually: https://github.com/FiloSottile/mkcert" >&2
      return 1
      ;;
  esac
}

# Create local certificates using mkcert
create_certificates() {
  install_mkcert || return 1
  
  mkdir -p "$CERT_DIR"
  
  # Install CA if not already done (check for CA key)
  if ! mkcert -CAROOT >/dev/null 2>&1 || [ ! -f "$(mkcert -CAROOT)/rootCA-key.pem" ]; then
    echo "Installing mkcert CA..."
    mkcert -install
  fi
  
  # Generate localhost certificates if they don't exist
  if [ ! -f "$CERT_DIR/localhost.pem" ] || [ ! -f "$CERT_DIR/localhost-key.pem" ]; then
    echo "Generating localhost certificates..."
    (cd "$CERT_DIR" && mkcert localhost 127.0.0.1 ::1)
    echo "✅ Local certificates created: $CERT_DIR/localhost.pem"
  else
    echo "✅ Local certificates already exist: $CERT_DIR/localhost.pem"
  fi
}
