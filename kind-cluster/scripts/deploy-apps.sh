#!/bin/bash

# PULL SECRETS
kubectl -n infrastructure create secret docker-registry github-pat-secret \
  --docker-server=ghcr.io \
  --docker-username=vusal-fl \
  --docker-password=$(echo -n $GITHUB_TOKEN_CLASSIC) \
  --docker-email=vusal@flamingo.cx

# ------------- INFRASTRUCTURE -------------

# + Loki (no dependencies)
# + Prometheus (depends on Loki)
# + Grafana (depends on Prometheus, Loki)
# + Redis (no dependencies)
# + Redis Exporter (depends on Redis, Loki)
# + Kafka (depends on Zookeeper, Loki)
# + Kafka UI (depends on Kafka, Loki)
# + MongoDB (depends on Loki)
# + MongoDB Exporter (depends on MongoDB, Loki)
# + Mongo Express (depends on MongoDB, Loki)
# + Cassandra (depends on Loki)
# + Nifi (depends on Loki)
# + Zookeeper (depends on Loki)
# + Pinot Controller (depends on Zookeeper)
# + Pinot Broker (depends on Pinot Controller)
# + Pinot Server (depends on Pinot Controller)
# Config Server (no dependencies)
# API (depends on Config Server, MongoDB, Kafka, Cassandra)
# Management (depends on Config Server, MongoDB)
# Openframe UI (depends on API, Management)
# Stream (depends on Kafka, Config Server, Cassandra, MongoDB)
# Gateway (depends on Config Server, MongoDB, Cassandra)

# INGRESS-NGINX
helm upgrade -i ingress-nginx ingress-nginx/ingress-nginx \
  -n ingress-nginx --create-namespace \
  --version 4.12.0 \
  -f ./kind-cluster/apps/infrastructure/ingress-nginx/helm/ingress-nginx.yaml && \
kubectl -n ingress-nginx wait --for=condition=Ready pod -l app.kubernetes.io/name=ingress-nginx --timeout 20m

# LOKI
kubectl -n monitoring apply -k ./kind-cluster/apps/infrastructure/openframe-loki/manifests && \
kubectl -n monitoring wait --for=condition=Ready pod -l app=openframe-loki --timeout 20m

kubectl -n monitoring apply -k ./kind-cluster/apps/infrastructure/openframe-promtail/manifests && \
kubectl -n monitoring wait --for=condition=Ready pod -l app=openframe-promtail --timeout 20m
# or
# helm upgrade --install loki grafana/loki-stack \
#   --version 2.10.2 \
#   -f ./kind-cluster/apps/infrastructure/loki/helm/loki-stack.yaml

# helm upgrade --install loki grafana/loki \
#   --version 6.28.0 \
#   -f ./kind-cluster/apps/infrastructure/loki/helm/loki.yaml

# helm upgrade --install promtail grafana/promtail \
#   --version 6.16.6 \
#   -f ./kind-cluster/apps/infrastructure/promtail/helm/promtail.yaml

# LOGGING
# kubectl apply -k ./kind-cluster/apps/infrastructure/logging/manifests

# helm upgrade -i es elastic/elasticsearch \
#   --version 8.5.1 \
#   -f ./kind-cluster/apps/infrastructure/logging/helm/es.yaml
# kubectl wait --for=condition=Ready pod -l release=es --timeout 20m

# helm upgrade -i fluent-bit fluent/fluent-bit \
#   --version 0.48.8 \
#   -f ./kind-cluster/apps/infrastructure/logging/helm/fluent-bit.yaml
# kubectl wait --for=condition=Ready pod -l relapp.kubernetes.io/name=fluent-bit --timeout 20m

# kubectl delete secrets kibana-kibana-es-token
# kubectl delete configmap kibana-kibana-helm-scripts -n elastic
# kubectl delete serviceaccount pre-install-kibana-kibana -n elastic
# kubectl delete roles pre-install-kibana-kibana -n elastic
# kubectl delete rolebindings pre-install-kibana-kibana -n elastic
# kubectl delete job pre-install-kibana-kibana -n elastic

# helm upgrade -i kibana elastic/kibana \
#   --version 8.5.1 \
#   -f ./kind-cluster/apps/infrastructure/logging/helm/kibana.yaml
# kubectl wait --for=condition=Ready pod -l release=kibana --timeout 20m

# GRAFANA + PROMETHEUS
helm upgrade -i kube-prometheus-stack prometheus-community/kube-prometheus-stack \
  -n monitoring --create-namespace \
  --version 69.8.2 \
  -f ./kind-cluster/apps/infrastructure/monitoring/helm/kube-prometheus-stack.yaml && \
kubectl -n monitoring wait --for=condition=Ready pod -l release=kube-prometheus-stack --timeout 20m

# Dashboards
kubectl -n monitoring apply -k ./kind-cluster/apps/infrastructure/monitoring/manifests

# REDIS
helm upgrade -i openframe-redis bitnami/redis \
  -n infrastructure --create-namespace \
  --version 20.11.3 \
  -f ./kind-cluster/apps/infrastructure/openframe-redis/helm/redis.yaml && \
kubectl -n infrastructure wait --for=condition=Ready pod -l app.kubernetes.io/name=redis --timeout 20m

# REDIS EXPORTER
# TODO: service montor enabled in redis chart directly, no need to istall this one
# helm upgrade -i prometheus-redis-exporter prometheus-community/prometheus-redis-exporter \
#   --version 6.9.0 \
#   -f ./kind-cluster/apps/infrastructure/prometheus-redis-exporter/helm/prometheus-redis-exporter.yaml
# kubectl wait --for=condition=Ready pod -l app.kubernetes.io/name=prometheus-redis-exporter --timeout 20m

# KAFKA
# TODO: increase memory limit for kafka-controller
helm upgrade -i openframe-kafka bitnami/kafka \
  -n infrastructure --create-namespace \
  --version 31.5.0 \
  -f ./kind-cluster/apps/infrastructure/openframe-kafka/helm/kafka.yaml && \
kubectl -n infrastructure wait --for=condition=Ready pod -l app.kubernetes.io/name=kafka --timeout 20m

# KAFKA UI
# helm repo add kafbat-ui https://kafbat.github.io/helm-charts
helm upgrade -i kafka-ui kafbat-ui/kafka-ui \
  -n infrastructure --create-namespace \
  --version 1.4.11 \
  -f ./kind-cluster/apps/infrastructure/kafka-ui/helm/kafka-ui.yaml && \
kubectl -n infrastructure wait --for=condition=Ready pod -l app.kubernetes.io/name=kafka-ui --timeout 20m

# MONGO DB
kubectl -n infrastructure apply -f ./kind-cluster/apps/infrastructure/openframe-mongodb/mongodb.yaml && \
kubectl -n infrastructure wait --for=condition=Ready pod -l app=openframe-mongodb --timeout 20m

# MONGO EXPORTER
helm upgrade -i prometheus-mongodb-exporter prometheus-community/prometheus-mongodb-exporter \
  -n infrastructure --create-namespace \
  --version 3.11.1 \
  -f ./kind-cluster/apps/infrastructure/prometheus-mongodb-exporter/helm/prometheus-mongodb-exporter.yaml && \
kubectl -n infrastructure wait --for=condition=Ready pod -l app.kubernetes.io/name=prometheus-mongodb-exporter --timeout 20m

# MONGO EXPRESS
kubectl -n infrastructure apply -f ./kind-cluster/apps/infrastructure/mongo-express/mongo-express.yaml && \
kubectl -n infrastructure wait --for=condition=Ready pod -l app=mongo-express --timeout 20m

# CASSANDRA
kubectl -n infrastructure apply -f ./kind-cluster/apps/infrastructure/openframe-cassandra/cassandra.yaml && \
kubectl -n infrastructure wait --for=condition=Ready pod -l app=openframe-cassandra --timeout 20m

# NIFI
# TODO: liveness probe fails, need to check
kubectl -n infrastructure apply -f ./kind-cluster/apps/infrastructure/openframe-nifi && \
kubectl -n infrastructure wait --for=condition=Ready pod -l app=openframe-nifi --timeout 20m

# ZOOKEEPER (for PINOTs)
# https://alex.dzyoba.com/blog/jmx-exporter/
# TODO: replace with bitnami/zookeeper and exporter with chart metrics
# helm upgrade -i zookeeper bitnami/zookeeper \
#   --version 13.7.4 \
#   -f ./kind-cluster/apps/infrastructure/zookeeper/helm/zookeeper.yaml
kubectl -n infrastructure apply -f ./kind-cluster/apps/infrastructure/zookeeper/zk.yaml && \
kubectl -n infrastructure wait --for=condition=Ready pod -l app=zookeeper --timeout 20m

# PINOT
kubectl -n infrastructure apply -f ./kind-cluster/apps/infrastructure/openframe-pinot/manifests && \
kubectl wait --for=condition=Ready pod -l app=pinot --timeout 20m

# helm repo add openframe-pinot https://raw.githubusercontent.com/apache/pinot/master/helm
# helm upgrade -i pinot pinot/pinot \
#     -n infrastructure --create-namespace \
#     --version 0.3.1

# CONFIG SERVER
kubectl -n infrastructure apply -f ./kind-cluster/apps/infrastructure/openframe-config/config-server.yaml && \
kubectl -n infrastructure wait --for=condition=Ready pod -l app=openframe-config --timeout 20m

# GATEWAY
kubectl -n infrastructure apply -f ./kind-cluster/apps/infrastructure/openframe-gateway/gateway.yaml && \
kubectl -n infrastructure wait --for=condition=Ready pod -l app=openframe-gateway --timeout 20m

# STREAM
kubectl apply -f ./kind-cluster/apps/infrastructure/stream/stream.yaml
kubectl wait --for=condition=Ready pod -l app=openframe-stream --timeout 20m

# OPENFRAME-UI
kubectl apply -f ./kind-cluster/apps/infrastructure/openframe-ui/openframe-ui.yaml
kubectl wait --for=condition=Ready pod -l app=openframe-ui --timeout 20m

# API
# management-key: docker-management-key-123  ???
kubectl -n infrastructure apply -f ./kind-cluster/apps/infrastructure/secrets.yaml && \
kubectl apply -f ./kind-cluster/apps/infrastructure/openframe-api/api.yaml && \
kubectl wait --for=condition=Ready pod -l app=openframe-api --timeout 20m



# ------------- AUTHENTIK -------------
kubectl apply -f ./kind-cluster/apps/authentik
kubectl wait --for=condition=Ready pod -l app=authentik-server --timeout 20m
kubectl wait --for=condition=Ready pod -l app=authentik-worker --timeout 20m
kubectl wait --for=condition=Ready pod -l app=authentik-postgresql --timeout 20m
kubectl wait --for=condition=Ready pod -l app=authentik-redis --timeout 20m

# ------------- FLEET -------------
kubectl apply -f ./kind-cluster/apps/fleet
kubectl wait --for=condition=Ready pod -l app=fleet --timeout 20m
kubectl wait --for=condition=Ready pod -l app=fleet-mdm-mysql --timeout 20m
kubectl wait --for=condition=Ready pod -l app=fleet-mdm-redis --timeout 20m

# ------------- MESH CENTRAL -------------
kubectl apply -f ./kind-cluster/apps/meshcentral
kubectl wait --for=condition=Ready pod -l app=meshcentral --timeout 20m
kubectl wait --for=condition=Ready pod -l app=meshcentral-mongodb --timeout 20m
kubectl wait --for=condition=Ready pod -l app=meshcentral-nginx --timeout 20m

# ------------- RMM -------------
kubectl apply -f ./kind-cluster/apps/tactical-rmm
kubectl wait --for=condition=Ready pod -l app=tactical-rmm --timeout 20m

# ------------- REGISTER TOOLS -------------
kubectl apply -f ./kind-cluster/apps/jobs/register-tools.yaml
kubectl wait --for=condition=Ready pod -l app=register-tools --timeout 20m
