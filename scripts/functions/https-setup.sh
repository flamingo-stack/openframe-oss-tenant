#!/bin/bash

# OpenFrame HTTPS setup - creates trusted localhost certificates

# Install mkcert if missing
if ! command -v mkcert >/dev/null; then
    if [[ "$OSTYPE" == "darwin"* ]] && command -v brew >/dev/null; then
        brew install mkcert
    elif [[ "$OSTYPE" == "linux"* ]]; then
        mkdir -p ~/bin
        curl -JLO "https://dl.filippo.io/mkcert/latest?for=linux/amd64"
        chmod +x mkcert-* && mv mkcert-* ~/bin/mkcert
        export PATH="$HOME/bin:$PATH"
    else
        echo "Install mkcert manually: https://github.com/FiloSottile/mkcert"
        exit 1
    fi
fi

# Generate certificates
mkdir -p ~/.openframe-certs && cd ~/.openframe-certs
mkcert -install
mkcert localhost 127.0.0.1 ::1

echo "✅ Certificates ready: ~/.openframe-certs/localhost.pem"