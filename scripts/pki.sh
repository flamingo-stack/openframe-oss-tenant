#!/bin/bash

if [ -f ${SCRIPT_DIR}/files/ca/ca.key ] && [ -f ${SCRIPT_DIR}/files/ca/ca.crt ]; then
  read -p "CA files already exist. Do you want to delete and generate new ones? [y/N] " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    rm -f ${SCRIPT_DIR}/files/ca/ca.key
    rm -f ${SCRIPT_DIR}/files/ca/ca.crt
  fi
fi

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
