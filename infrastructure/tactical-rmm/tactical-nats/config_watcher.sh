#!/bin/sh

NATS_CONFIG="${TACTICAL_DIR}/nats/nats-rmm.conf"
NATS_CHECK_INTERVAL=1

while true; do
    sleep ${NATS_CHECK_INTERVAL}
    if [ ! -z "${NATS_CHECK}" ]; then
        NATS_RELOAD=$(date -r "${NATS_CONFIG}")
        if [ "$NATS_RELOAD" = "$NATS_CHECK" ]; then
            :
        else
            nats-server --signal reload
            NATS_CHECK=$(date -r "${NATS_CONFIG}")
        fi
    else 
        NATS_CHECK=$(date -r "${NATS_CONFIG}")
    fi
done 