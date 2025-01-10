#!/bin/sh

set -e

# Start NATS server with the configuration file
exec nats-server -c ${TACTICAL_DIR}/nats/nats-rmm.conf
