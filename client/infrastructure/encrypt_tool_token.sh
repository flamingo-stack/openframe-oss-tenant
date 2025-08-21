#!/usr/bin/env bash
# encrypt_tool_token.sh
#
# Encrypts the provided plaintext using AES-256-GCM, writes the combined
# (nonce + ciphertext) output in base64 to a file named "tool_token.enc" in
# the repository root, and prints the absolute path of that file.
#
# Usage:
#   ./encrypt_tool_token.sh "your-secret-token"
#   # If no argument is supplied, you will be securely prompted for the token.
#
# Notes:
# 1. ENCRYPTION_KEY **must** be exactly 32 printable ASCII characters (256-bit)
#    to satisfy AES-256 key requirements.
# 2. A fresh 12-byte random nonce (IV) is generated for every execution.
# 3. The output file will be overwritten if it already exists.

set -euo pipefail

########################################
# Validate inputs & environment
########################################

KEY_FIXED="12345678901234567890123456789012"  # 32-byte AES-256 key

PLAINTEXT="${1:-}"
if [[ -z "$PLAINTEXT" ]]; then
  # Prompt the user (silent, no echo)
  read -rp "Enter access token: " PLAINTEXT
fi
if [[ -z "$PLAINTEXT" ]]; then
  echo "[ERROR] Empty token provided. Aborting." >&2
  exit 1
fi

########################################
# Preparation: derive key/nonce paths
########################################

# Convert fixed key to hex
KEY_HEX="$(echo -n "$KEY_FIXED" | xxd -p -c 256)"

# Create temp workspace
WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT

NONCE_BIN="$WORKDIR/nonce.bin"
CIPHERTEXT_BIN="$WORKDIR/ciphertext.bin"
COMBINED_BIN="$WORKDIR/combined.bin"
TAG_BIN="$WORKDIR/tag.bin"

# Generate 12-byte nonce (IV)
head -c 12 /dev/urandom > "$NONCE_BIN"
IV_HEX="$(xxd -p "$NONCE_BIN" | tr -d '\n')"

########################################
# Encryption using OpenSSL AES-256-GCM
########################################

# Encrypt in binary mode (no base64, no salt header).
# We detect whether current OpenSSL supports "-tag" option (OpenSSL ≥1.1.1)
# as preferred method; if not, we fall back to "-aead" and later split the tag.

OPENSSL_BIN="openssl"
# Prefer Homebrew OpenSSL 3 if available (supports AES-GCM fully)
if [[ -x "/opt/homebrew/opt/openssl@3/bin/openssl" ]]; then
  OPENSSL_BIN="/opt/homebrew/opt/openssl@3/bin/openssl"
elif [[ -x "/usr/local/opt/openssl@3/bin/openssl" ]]; then
  OPENSSL_BIN="/usr/local/opt/openssl@3/bin/openssl"
fi

OPENSSL_SUPPORTS_TAG=$($OPENSSL_BIN enc -aes-256-gcm -help 2>&1 | grep -c " -tag") || true
OPENSSL_SUPPORTS_AEAD=$($OPENSSL_BIN enc -aes-256-gcm -help 2>&1 | grep -c " -aead") || true

# Prefer -tag
if [[ "$OPENSSL_SUPPORTS_TAG" -gt 0 ]]; then
  # Use modern -tag flag (ciphertext and tag separate files)
  "$OPENSSL_BIN" enc -aes-256-gcm -K "$KEY_HEX" -iv "$IV_HEX" -nosalt \
    -in <(printf "%s" "$PLAINTEXT") \
    -out "$CIPHERTEXT_BIN" \
    -tag "$TAG_BIN"
# Fallback to -aead if available
elif [[ "$OPENSSL_SUPPORTS_AEAD" -gt 0 ]]; then
  # Fallback to -aead (ciphertext||tag together -> need split)
  "$OPENSSL_BIN" enc -aes-256-gcm -K "$KEY_HEX" -iv "$IV_HEX" -nosalt -aead \
    -in <(printf "%s" "$PLAINTEXT") \
    -out "$CIPHERTEXT_BIN"

  # Separate the 16-byte tag from end of ciphertext
  TAG_BIN_LEN=16
  CT_SIZE=$(stat -c%s "$CIPHERTEXT_BIN")
  if (( CT_SIZE <= TAG_BIN_LEN )); then
    echo "[ERROR] Ciphertext too short; encryption failed." >&2
    exit 1
  fi
  dd if="$CIPHERTEXT_BIN" of="$TAG_BIN" bs=1 skip=$((CT_SIZE - TAG_BIN_LEN)) count=$TAG_BIN_LEN status=none
  dd if="$CIPHERTEXT_BIN" of="$CIPHERTEXT_BIN.tmp" bs=1 count=$((CT_SIZE - TAG_BIN_LEN)) status=none
  mv "$CIPHERTEXT_BIN.tmp" "$CIPHERTEXT_BIN"
# Final fallback: use AES-256-CBC (no auth tag)
else
  echo "[WARN] OpenSSL does not support AES-GCM flags; falling back to AES-256-CBC (no authentication tag)" >&2

  # For CBC we need 16-byte IV
  IV_HEX_FULL=$(head -c 16 /dev/urandom | xxd -p -c 32)
  echo "$IV_HEX_FULL" | xxd -r -p > "$NONCE_BIN"  # reuse variable as IV storage (16 bytes)

  "$OPENSSL_BIN" enc -aes-256-cbc -K "$KEY_HEX" -iv "$IV_HEX_FULL" -nosalt \
    -in <(printf "%s" "$PLAINTEXT") \
    -out "$CIPHERTEXT_BIN"

  # No tag in CBC mode; create empty tag file for concatenation consistency
  : > "$TAG_BIN"
fi

########################################
# Combine nonce + ciphertext + tag, then base64 encode
########################################

cat "$NONCE_BIN" "$CIPHERTEXT_BIN" "$TAG_BIN" > "$COMBINED_BIN"
BASE64_OUTPUT="$(base64 -w 0 < "$COMBINED_BIN")"

########################################
# Write result to tool_token.enc in repo root
########################################

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_FILE="$SCRIPT_DIR/tool_token.enc"

echo -n "$BASE64_OUTPUT" > "$OUTPUT_FILE"

# Inform user what was encrypted
echo "Token encrypted: $PLAINTEXT"

########################################
# Print absolute path to the created file
########################################

echo "$OUTPUT_FILE"

