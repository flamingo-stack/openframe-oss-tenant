#!/bin/bash

# Wait for Elasticsearch to be ready
until kubectl get pod elasticsearch-master-0 -n logging -o jsonpath='{.status.phase}' | grep -q "Running"; do
  echo "Waiting for Elasticsearch to be ready..."
  sleep 5
done

# Wait for Elasticsearch to be fully operational
until kubectl exec elasticsearch-master-0 -n logging -- curl -s -k "https://localhost:9200/_cluster/health" | grep -q '"status":"green"'; do
  echo "Waiting for Elasticsearch cluster to be healthy..."
  sleep 5
done

# Generate service account token
# Note: This uses the built-in elastic/kibana service account
ES_TOKEN=$(kubectl exec elasticsearch-master-0 -n logging -- curl -s -k -X POST "https://localhost:9200/_security/service/elastic/kibana/credential/kibana-token" \
  -H "Content-Type: application/json" \
  -d '{"name": "kibana-token"}' | jq -r '.token.value')

if [ -z "$ES_TOKEN" ]; then
  echo "Failed to generate token"
  exit 1
fi

# Update the secret
kubectl create secret generic kibana-kibana-es-token \
  -n logging \
  --from-literal=token=$ES_TOKEN \
  --dry-run=client -o yaml | kubectl apply -f -

echo "Successfully updated Kibana token"