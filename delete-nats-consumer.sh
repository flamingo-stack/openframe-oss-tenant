#!/bin/bash

# Delete NATS consumer for ToolConnectionListener
# Stream: TOOL_CONNECTIONS
# Consumer: tool-connection-processor

NAMESPACE="datasources"
STREAM_NAME="TOOL_CONNECTIONS"
CONSUMER_NAME="tool-connection-processor"
NATS_USER="service"
NATS_PASSWORD="service_pass"

echo "Deleting NATS consumer..."
echo "Stream: $STREAM_NAME"
echo "Consumer: $CONSUMER_NAME"
echo ""

# Delete consumer using nats-box pod
echo "Deleting consumer using nats-box..."
kubectl run nats-box --rm -i --image=natsio/nats-box --restart=Never -n $NAMESPACE -- \
    nats consumer rm $STREAM_NAME $CONSUMER_NAME -f \
    --server=nats:4222 \
    --user=$NATS_USER \
    --password=$NATS_PASSWORD

if [ $? -eq 0 ]; then
    echo ""
    echo "✓ Consumer deleted successfully!"
    echo ""
    echo "Verifying deletion..."
    kubectl run nats-box --rm -i --image=natsio/nats-box --restart=Never -n $NAMESPACE -- \
        nats consumer ls $STREAM_NAME \
        --server=nats:4222 \
        --user=$NATS_USER \
        --password=$NATS_PASSWORD
    
    echo ""
    echo "Stream info:"
    kubectl run nats-box --rm -i --image=natsio/nats-box --restart=Never -n $NAMESPACE -- \
        nats stream info $STREAM_NAME \
        --server=nats:4222 \
        --user=$NATS_USER \
        --password=$NATS_PASSWORD
else
    echo ""
    echo "✗ Failed to delete consumer"
    exit 1
fi

