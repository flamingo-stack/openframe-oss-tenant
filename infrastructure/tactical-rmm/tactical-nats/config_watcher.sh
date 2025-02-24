#!/bin/bash

while true; do
    sleep "${NATS_CONFIG_CHECK_INTERVAL:-5}"
    if [ -n "${NATS_CHECK}" ]; then
        NATS_RELOAD=$(date -r "${NATS_CONFIG}")
        if [ "${NATS_RELOAD}" = "${NATS_CHECK}" ]; then
            echo "NATS_RELOAD: ${NATS_RELOAD}"
            echo "NATS_CHECK: ${NATS_CHECK}"
        else
            echo "Reloading NATS"
            nats-server --signal reload
            NATS_CHECK=$(date -r "${NATS_CONFIG}")
        fi
    else 
        NATS_CHECK=$(date -r "${NATS_CONFIG}")
    fi
done