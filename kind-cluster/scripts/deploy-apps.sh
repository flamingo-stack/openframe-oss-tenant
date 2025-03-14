#!/bin/bash

# PULL SECRETS
kubectl create secret docker-registry github-pat-secret \
  --docker-server=ghcr.io \
  --docker-username=vusal-fl \
  --docker-password=$(echo -n $GITHUB_TOKEN_CLASSIC) \
  --docker-email=vusal@flamingo.cx

# ------------- INFRASTRUCTURE -------------
# INGRESS-NGINX
helm upgrade -i ingress-nginx ingress-nginx/ingress-nginx \
  -n ingress-nginx --create-namespace \
  --version 4.12.0 \
  -f ./kind-cluster/apps/infrastructure/ingress-nginx/helm/ingress-nginx.yaml
kubectl -n ingress-nginx wait --for=condition=Ready pod -l app.kubernetes.io/name=ingress-nginx --timeout 20m

# MONITORING
helm upgrade -i kube-prometheus-stack prometheus-community/kube-prometheus-stack \
  -n monitoring --create-namespace \
  --version 69.8.2 \
  -f ./kind-cluster/apps/infrastructure/monitoring/helm/kube-prometheus-stack.yaml
kubectl -n monitoring wait --for=condition=Ready pod -l release=kube-prometheus-stack --timeout 20m

# Dashboards
kubectl -n monitoring apply -k ./kind-cluster/apps/infrastructure/monitoring/manifests

# LOKI
kubectl -n monitoring apply -k ./kind-cluster/apps/infrastructure/openframe-loki/manifests
kubectl -n monitoring wait --for=condition=Ready pod -l app=openframe-loki --timeout 20m

kubectl -n monitoring apply -k ./kind-cluster/apps/infrastructure/openframe-promtail/manifests
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

# REDIS + EXPORTER
helm upgrade -i redis bitnami/redis \
  --version 20.11.3 \
  -f ./kind-cluster/apps/infrastructure/redis/helm/redis.yaml
kubectl wait --for=condition=Ready pod -l app.kubernetes.io/name=redis --timeout 20m

# TODO: install it to monitoring ns
helm upgrade -i prometheus-redis-exporter prometheus-community/prometheus-redis-exporter \
  --version 6.9.0 \
  -f ./kind-cluster/apps/infrastructure/prometheus-redis-exporter/helm/prometheus-redis-exporter.yaml
kubectl wait --for=condition=Ready pod -l app.kubernetes.io/name=prometheus-redis-exporter --timeout 20m

# MONGO + EXPORTER + UI
kubectl apply -f ./kind-cluster/apps/infrastructure/mongodb/mongodb.yaml
kubectl wait --for=condition=Ready pod -l app=mongodb --timeout 20m

helm upgrade -i prometheus-mongodb-exporter prometheus-community/prometheus-mongodb-exporter \
  --version 3.11.1 \
  -f ./kind-cluster/apps/infrastructure/prometheus-mongodb-exporter/helm/prometheus-mongodb-exporter.yaml
kubectl wait --for=condition=Ready pod -l app.kubernetes.io/name=prometheus-mongodb-exporter --timeout 20m

kubectl apply -f ./kind-cluster/apps/infrastructure/mongo-express/mongo-express.yaml
kubectl wait --for=condition=Ready pod -l app=mongo-express --timeout 20m

# KAFKA + UI
helm upgrade -i kafka bitnami/kafka \
  --version 31.5.0 \
  -f ./kind-cluster/apps/infrastructure/kafka/helm/kafka.yaml
kubectl wait --for=condition=Ready pod -l app.kubernetes.io/name=kafka --timeout 20m

helm repo add kafbat-ui https://kafbat.github.io/helm-charts
helm upgrade -i kafka-ui kafbat-ui/kafka-ui \
  --version 1.4.11 \
  -f ./kind-cluster/apps/infrastructure/kafka-ui/helm/kafka-ui.yaml
kubectl wait --for=condition=Ready pod -l app.kubernetes.io/name=kafka-ui --timeout 20m

# CASSANDRA
# fix: add export to image during build
kubectl apply -f ./kind-cluster/apps/infrastructure/cassandra/cassandra.yaml
kubectl wait --for=condition=Ready pod -l app=cassandra --timeout 20m

# Deploy the services
# management-key: docker-management-key-123
kubectl apply -f ./kind-cluster/apps/infrastructure/secrets.yaml

kubectl apply -f ./kind-cluster/apps/infrastructure/gateway/gateway.yaml
kubectl wait --for=condition=Ready pod -l app=openframe-gateway --timeout 20m

kubectl apply -f ./kind-cluster/apps/infrastructure/stream/stream.yaml
kubectl wait --for=condition=Ready pod -l app=openframe-gateway --timeout 20m

kubectl apply -f ./kind-cluster/apps/infrastructure/openframe-ui/openframe-ui.yaml
kubectl wait --for=condition=Ready pod -l app=openframe-ui --timeout 20m

kubectl apply -f ./kind-cluster/apps/infrastructure/openframe-api/api.yaml
kubectl wait --for=condition=Ready pod -l app=openframe-api --timeout 20m

kubectl apply -f ./kind-cluster/apps/infrastructure/openframe-config/config-server.yaml
kubectl wait --for=condition=Ready pod -l app=openframe-config --timeout 20m

# ------------- ZOOKEEPER -------------
# TODO: add zookeeper for
# helm upgrade -i zookeeper bitnami/zookeeper \
#   --version 13.7.4 \
#   -f ./kind-cluster/apps/infrastructure/zookeeper/helm/zookeeper.yaml
# kubectl apply -f ./kind-cluster/apps/infrastructure/zookeeper/zk.yaml

# pinot servers
kubectl apply -f ./kind-cluster/apps/infrastructure/pinot/pinot.yaml
kubectl wait --for=condition=Ready pod -l app=pinot --timeout 20m

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
