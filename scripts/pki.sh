#!/bin/bash

if [ -f ${SCRIPT_DIR}/files/ca/ca.key ] && [ -f ${SCRIPT_DIR}/files/ca/ca.crt ]; then
  read -p "CA files already exist. Do you want to delete and generate new ones? [y/N] " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    rm -f ${SCRIPT_DIR}/files/ca/ca.key
    rm -f ${SCRIPT_DIR}/files/ca/ca.crt
  else
    exit 0
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
