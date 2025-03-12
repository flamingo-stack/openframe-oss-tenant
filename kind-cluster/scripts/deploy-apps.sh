#!/bin/bash

# Deploy ingress-nginx
helm upgrade -i ingress-nginx ingress-nginx/ingress-nginx \
  -n ingress-nginx --create-namespace \
  --version 4.12.0 \
  -f ./kind-cluster/apps/infrastructure/ingress-nginx/helm/ingress-nginx.yaml

kubectl -n ingress-nginx wait --for=condition=Ready pod -l app.kubernetes.io/name=ingress-nginx

# Monitoring
# GRAFANA_FQDN="grafana.$DOMAIN"
# GRAFANA_ENTRY="${IP} ${GRAFANA_FQDN}"
# if ! grep -qF "$GRAFANA_ENTRY" "$HOSTS_FILE"; then
#     echo "$GRAFANA_ENTRY" | sudo tee -a "$HOSTS_FILE"
# fi

# PROMETHEUS_FQDN="prometheus.$DOMAIN"
# PROMETHEUS_ENTRY="${IP} ${PROMETHEUS_FQDN}"
# if ! grep -qF "$PROMETHEUS_ENTRY" "$HOSTS_FILE"; then
#     echo "$PROMETHEUS_ENTRY" | sudo tee -a "$HOSTS_FILE"
# fi

# ALERTMANAGER_FQDN="alertmanager.$DOMAIN"
# ALERTMANAGER_ENTRY="${IP} ${ALERTMANAGER_FQDN}"
# if ! grep -qF "$ALERTMANAGER_ENTRY" "$HOSTS_FILE"; then
#     echo "$ALERTMANAGER_ENTRY" | sudo tee -a "$HOSTS_FILE"
# fi

# helm upgrade -i kube-prometheus-stack prometheus-community/kube-prometheus-stack \
#   -n monitoring --create-namespace \
#   --version 69.8.2 \
#   -f ./kind-cluster/apps/infrastructure/monitoring/helm/kube-prometheus-stack.yaml

# kubectl -n monitoring wait --for=condition=Ready pod -l release=kube-prometheus-stack

# kubectl apply -n monitoring -k ./kind-cluster/apps/monitoring/manifests/dashboards

# Logging
# KIBANA_FQDN="kibana.$DOMAIN"
# KIBANA_ENTRY="${IP} ${KIBANA_FQDN}"
# if ! grep -qF "$KIBANA_ENTRY" "$HOSTS_FILE"; then
#     echo "$KIBANA_ENTRY" | sudo tee -a "$HOSTS_FILE"
# fi
# kubectl apply -k ./kind-cluster/apps/infrastructure/logging/manifests

# helm upgrade -i es elastic/elasticsearch \
#   -n logging --create-namespace \
#   --version 8.5.1 \
#   -f ./kind-cluster/apps/infrastructure/logging/helm/es.yaml

# sudo sysctl fs.inotify.max_user_instances=1024
# sudo sysctl -p

# helm upgrade -i fluent-bit fluent/fluent-bit \
#   -n logging --create-namespace \
#   --version 0.48.8 \
#   -f ./kind-cluster/apps/infrastructure/logging/helm/fluent-bit.yaml

# kubectl -n logging delete secrets kibana-kibana-es-token
# kubectl -n logging delete configmap kibana-kibana-helm-scripts -n elastic
# kubectl -n logging delete serviceaccount pre-install-kibana-kibana -n elastic
# kubectl -n logging delete roles pre-install-kibana-kibana -n elastic
# kubectl -n logging delete rolebindings pre-install-kibana-kibana -n elastic
# kubectl -n logging delete job pre-install-kibana-kibana -n elastic

# helm upgrade -i kibana elastic/kibana \
#   -n logging --create-namespace \
#   --version 8.5.1 \
#   -f ./kind-cluster/apps/infrastructure/logging/helm/kibana.yaml --no-hooks

# helm upgrade -i redis bitnami/redis \
#   --version 20.11.3 \
#   -f ./kind-cluster/apps/infrastructure/redis/helm/redis.yaml

# TODO: install it to monitoring ns
# helm upgrade -i prometheus-redis-exporter prometheus-community/prometheus-redis-exporter \
#   --version 6.9.0 \
#   -f ./kind-cluster/apps/infrastructure/prometheus-redis-exporter/helm/prometheus-redis-exporter.yaml

# MONGO
kubectl create secret docker-registry github-pat-secret \
  --docker-server=ghcr.io \
  --docker-username=vusal-fl \
  --docker-password=$(echo -n $GITHUB_TOKEN_CLASSIC) \
  --docker-email=vusal@flamingo.cx

# kubectl apply -f ./kind-cluster/apps/infrastructure/mongodb/mongodb.yaml

# helm upgrade -i prometheus-mongodb-exporter prometheus-community/prometheus-mongodb-exporter \
#   --version 3.11.1 \
#   -f ./kind-cluster/apps/infrastructure/prometheus-mongodb-exporter/helm/prometheus-mongodb-exporter.yaml

# kubectl apply -f ./kind-cluster/apps/infrastructure/mongo-express/mongo-express.yaml

# KAFKA + UI

# helm upgrade -i kafka bitnami/kafka \
#   --version 31.5.0 \
#   -f ./kind-cluster/apps/infrastructure/kafka/helm/kafka.yaml

# helm repo add kafbat-ui https://kafbat.github.io/helm-charts
# helm upgrade -i kafka-ui kafbat-ui/kafka-ui \
#   --version 1.4.11 \
#   -f ./kind-cluster/apps/infrastructure/kafka-ui/helm/kafka-ui.yaml

# CASSANDRA
# fix: add export to image during build
# kubectl apply -f ./kind-cluster/apps/infrastructure/cassandra/cassandra.yaml

# Deploy the services
# management-key: docker-management-key-123
kubectl apply -f ./kind-cluster/apps/infrastructure/secrets.yaml

kubectl apply -f ./kind-cluster/apps/infrastructure/gateway/gateway.yaml
kubectl apply -f ./kind-cluster/apps/infrastructure/stream/stream.yaml
kubectl apply -f ./kind-cluster/apps/infrastructure/openframe-ui/openframe-ui.yaml
kubectl apply -f ./kind-cluster/apps/infrastructure/openframe-api/api.yaml
kubectl apply -f ./kind-cluster/apps/infrastructure/openframe-config/config-server.yaml

# ZK
helm upgrade -i zookeeper bitnami/zookeeper \
  --version 13.7.4 \
  -f ./kind-cluster/apps/infrastructure/zookeeper/helm/zookeeper.yaml
kubectl apply -f ./kind-cluster/apps/infrastructure/zookeeper/zk.yaml

# pinot servers
kubectl apply -f ./kind-cluster/apps/infrastructure/pinot/pinot.yaml
