#!/bin/bash

# if [ "${SILENT}" != "true" ] && [ -f "${SCRIPT_DIR}/files/ca/ca.key" ] && [ -f "${SCRIPT_DIR}/files/ca/ca.crt" ]; then
#   read -p "CA files already exist. Do you want to delete and generate new ones? [y/N] " -n 1 -r
#   echo
#   if [[ $REPLY =~ ^[Yy]$ ]]; then
#     rm -f ${SCRIPT_DIR}/files/ca/ca.key
#     rm -f ${SCRIPT_DIR}/files/ca/ca.crt
#   fi
# fi

if [ "${SILENT}" != "true" ]; then
  if [ ! -f "${SCRIPT_DIR}/files/ca/ca.key" ] || [ ! -f "${SCRIPT_DIR}/files/ca/ca.crt" ]; then
    echo "Generating CA certificate"
    rm -f ${SCRIPT_DIR}/files/ca/ca.key
    rm -f ${SCRIPT_DIR}/files/ca/ca.crt

    # Create certificate authority private key
    openssl genrsa -out ${SCRIPT_DIR}/files/ca/ca.key 4096

    # Create CA using key we created in the previous step.
    openssl req \
      -new \
      -x509 \
      -sha256 \
      -days 10950 \
      -key ${SCRIPT_DIR}/files/ca/ca.key \
      -out ${SCRIPT_DIR}/files/ca/ca.crt \
      -config ${SCRIPT_DIR}/files/ca/openssl.cnf
  fi
else
  echo "Using existing CA certificates from repo"
fi

# Check if running on Ubuntu and ask to import CA
# if [ -f /etc/lsb-release ] && grep -q "Ubuntu" /etc/lsb-release; then
#   read -p "Do you want to import the CA certificate to Ubuntu's trust store? [y/N] " -n 1 -r
#   echo
#   if [[ $REPLY =~ ^[Yy]$ ]]; then
#     # Create a unique name for the cert using its subject hash
#     CERT_HASH=$(openssl x509 -hash -noout -in ${SCRIPT_DIR}/files/ca/ca.crt)

#     # System-wide CA installation
#     sudo cp ${SCRIPT_DIR}/files/ca/ca.crt /usr/local/share/ca-certificates/custom_ca.crt
#     sudo update-ca-certificates

#     # Curl specific CA handling
#     sudo mkdir -p /etc/ssl/certs
#     sudo cp ${SCRIPT_DIR}/files/ca/ca.crt /etc/ssl/certs/${CERT_HASH}.0
#     sudo c_rehash /etc/ssl/certs/

#     echo "CA certificate imported successfully to system and curl trust stores"
#   fi
# fi

if [ $OS == "Linux" ]; then
  # Check if CA certificate is already imported to NSSDB
  if [ "$(certutil -d sql:$HOME/.pki/nssdb -L | grep OpenFrame | cut -d ' ' -f 1,2)" == "OpenFrame CA" ]; then
    echo "CA certificate already imported to NSSDB"
  else
  # Import CA certificate to NSSDB
    certutil -d sql:$HOME/.pki/nssdb -A -n "OpenFrame CA" -i ${SCRIPT_DIR}/files/ca/ca.crt -t CT,C,C
    echo "CA certificate imported to NSSDB"
  fi
elif [ $OS == "Darwin" ]; then
  # Check if CA certificate is already imported to Keychain
  if security find-certificate -c "OpenFrame Root CA" -p > /dev/null 2>&1; then
    echo "CA certificate already imported to Keychain"
  else
    security add-trusted-cert -e hostnameMismatch -r trustRoot -k ~/Library/Keychains/login.keychain-db ${SCRIPT_DIR}/files/ca/ca.crt
    echo "CA certificate imported to Keychain"
  fi
else
  echo "Unsupported OS"
  exit 1
fi

# read -p "Press Enter to continue"
