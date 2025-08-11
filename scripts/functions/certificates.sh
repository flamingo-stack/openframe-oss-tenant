#!/bin/bash

set -euo pipefail

# Install mkcert if not available
install_mkcert() {
  command -v mkcert >/dev/null 2>&1 && return 0
  
  echo "Installing mkcert..."
  case "$OSTYPE" in
    darwin*) 
      command -v brew >/dev/null 2>&1 || { echo "Error: brew required for mkcert on macOS" >&2; return 1; }
      brew install mkcert ;;
    linux*)
      mkdir -p "$HOME/bin"
      curl -fsSL -o "$HOME/bin/mkcert" "https://dl.filippo.io/mkcert/latest?for=linux/amd64"
      chmod +x "$HOME/bin/mkcert"
      export PATH="$HOME/bin:$PATH" ;;
    *)
      echo "Error: Unsupported OS. Install mkcert manually: https://github.com/FiloSottile/mkcert" >&2
      return 1
      ;;
  esac
}

resolve_login_keychain() {
  local kc
  kc="$(security default-keychain -d user | tr -d '"')" || true
  [ -n "$kc" ] && [ -e "$kc" ] && { echo "$kc"; return; }
  [ -e "$HOME/Library/Keychains/login.keychain-db" ] && { echo "$HOME/Library/Keychains/login.keychain-db"; return; }
  echo ""; return
}


# Create local certificates using mkcert
create_certificates() {
  install_mkcert || return 1
  
  mkdir -p "$CERT_DIR"
  CAROOT="$(mkcert -CAROOT)"
  
  # Install CA if not already done (check for CA key)
  if ! mkcert -CAROOT >/dev/null 2>&1 || [ ! -f "$(mkcert -CAROOT)/rootCA-key.pem" ]; then
    echo "Installing mkcert CA..."
    TRUST_STORES=nss mkcert -install
  fi

  # Generate localhost certificates
  echo "Generating localhost certificates..."
  (cd "$CERT_DIR" && mkcert -cert-file localhost.pem -key-file localhost-key.pem localhost 127.0.0.1 ::1)
  echo "Certificates created: $CERT_DIR/localhost.pem"

  # macOS user-level trust – only if interactive, otherwise skip to avoid hang
  if [ "$(uname -s)" = "Darwin" ]; then
    KC="$(resolve_login_keychain)"
    security find-certificate -a -c "mkcert" -Z "$KC" \
    | awk '/SHA-1 hash:/ {print $3}' \
    | while read -r SHA; do
        security delete-certificate -Z "$SHA" "$KC"
    done
    echo "Adding mkcert CA to your login keychain (will show a user trust popup)…"
    security add-trusted-cert -r trustRoot -p ssl -k "$KC" "$CAROOT/rootCA.pem"
  fi
}

delete_certificates() {
  echo "Removing localhost certificates from $CERT_DIR..."

  rm -f "$CERT_DIR"/localhost.pem \
        "$CERT_DIR"/localhost-key.pem \
        "$CERT_DIR"/localhost+*.pem

  echo "Certificates removed."
}
