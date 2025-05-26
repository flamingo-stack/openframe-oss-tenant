#!/bin/bash

function trust_ca() {
  local CA_SECRET="platform-certificate"
  local CA_NAMESPACE="platform"
  local TMP_CA_PATH
  TMP_CA_PATH=$(mktemp)

  echo "Extracting CA certificate from Kubernetes secret..."
  echo "Executing: kubectl get secret \"$CA_SECRET\" -n \"$CA_NAMESPACE\" -o jsonpath='{.data.ca\\.crt}' | base64 -d >\"$TMP_CA_PATH\""
  for i in {1..60}; do
    TMP_OUT=$(mktemp)
    if kubectl get secret "$CA_SECRET" -n "$CA_NAMESPACE" -o jsonpath='{.data.ca\.crt}' 2>/dev/null | base64 -d >"$TMP_OUT" && [ -s "$TMP_OUT" ]; then
      mv "$TMP_OUT" "$TMP_CA_PATH"
      break
    else
      rm -f "$TMP_OUT"
      echo "Retrying to extract CA certificate... ($i/60)"
      sleep 2
    fi
    if [ "$i" -eq 60 ]; then
      echo "Failed to extract or decode CA cert from '$CA_SECRET' in namespace '$CA_NAMESPACE'"
      return 1
    fi
  done

  if [ ! -s "$TMP_CA_PATH" ]; then
    echo "Extracted CA cert is empty"
    rm -f "$TMP_CA_PATH"
    return 1
  fi

  echo "Trusting CA certificate on OS: $OS"

  case "$OS" in
  Linux*)
    mkdir -p "$HOME/.pki/nssdb"
    certutil -N --empty-password -d sql:$HOME/.pki/nssdb 2>/dev/null || true
    if certutil -d sql:$HOME/.pki/nssdb -L 2>/dev/null | grep -q "$CA_SECRET"; then
      echo "CA certificate already imported to NSSDB"
    else
      certutil -d sql:$HOME/.pki/nssdb -A -n "$CA_SECRET" -i "$TMP_CA_PATH" -t CT,C,C
      echo "CA certificate imported to NSSDB"
    fi
    ;;

  Darwin*)
    if security find-certificate -c "$CA_SECRET" -p >/dev/null 2>&1; then
      echo "CA certificate already trusted in macOS Keychain, deleting..."
      security delete-certificate -c "$CA_SECRET" ~/Library/Keychains/login.keychain-db
      echo "CA certificate deleted from macOS Keychain"
    fi
    security add-trusted-cert -e hostnameMismatch -r trustRoot -k ~/Library/Keychains/login.keychain-db "$TMP_CA_PATH"
    echo "CA certificate trusted in macOS Keychain"
    ;;

  MINGW* | CYGWIN* | MSYS*)
    echo "🪟 Windows detected. Installing certificate for Windows browsers..."
    CERT_PATH_WIN=$(cygpath -w "$TMP_CA_PATH")
    certutil -addstore -f "ROOT" "$CERT_PATH_WIN"
    echo ""
    echo "If you see an error, manually import the certificate via certmgr.msc"
    echo "1. Press Win+R and type 'certmgr.msc'"
    echo "2. Right-click on 'Trusted Root Certification Authorities' -> 'All Tasks' -> 'Import'"
    echo "3. Browse to: ${CERT_PATH_WIN}"
    echo "4. Follow the wizard to complete the import"
    ;;

  *)
    echo "Unsupported or unknown OS architecture: $OS"
    rm -f "$TMP_CA_PATH"
    return 1
    ;;
  esac

  rm -f "$TMP_CA_PATH"
}

function untrust_ca() {
  local CA_SECRET="platform-certificate"

  echo "Untrusting CA certificate on OS: $OS"

  case "$OS" in
  Linux*)
    if certutil -d sql:$HOME/.pki/nssdb -L 2>/dev/null | grep -q "$CA_SECRET"; then
      certutil -d sql:$HOME/.pki/nssdb -D -n "$CA_SECRET"
      echo "CA certificate removed from NSSDB"
    else
      echo "CA not found in NSSDB"
    fi
    ;;

  Darwin*)
    if security find-certificate -c "$CA_SECRET" -p >/dev/null 2>&1; then
      security delete-certificate -c "$CA_SECRET" ~/Library/Keychains/login.keychain-db
      echo "CA certificate removed from macOS Keychain"
    else
      echo "CA not found in macOS Keychain"
    fi
    ;;

  MINGW* | CYGWIN* | MSYS*)
    echo "Windows detected. Removing from cert store..."
    certutil -delstore "ROOT" "$CA_SECRET"
    echo "CA certificate removed from Windows ROOT store"
    ;;

  *)
    echo "Unsupported or unknown OS: $OS"
    return 1
    ;;
  esac
}
