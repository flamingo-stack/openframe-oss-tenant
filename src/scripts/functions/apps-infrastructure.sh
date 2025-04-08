#!/bin/bash

# INGRESS-NGINX
function infra_ingress_nginx_deploy() {
  helm_repo_ensure "ingress-nginx" "https://kubernetes.github.io/ingress-nginx"

  echo "Deploying ingress-nginx"
  helm upgrade -i ingress-nginx ingress-nginx/ingress-nginx \
    -n ingress-nginx --create-namespace \
    --version 4.12.0 \
    -f ./kind-cluster/apps/infrastructure/ingress-nginx/helm/ingress-nginx.yaml
}

function infra_ingress_nginx_wait() {
  echo "Waiting for ingress-nginx to be ready"
  wait_for_app "ingress-nginx" "app.kubernetes.io/instance=ingress-nginx"
}

# Monitoring: GRAFANA + PROMETHEUS
function infra_monitoring_deploy() {
    helm_repo_ensure prometheus-community https://prometheus-community.github.io/helm-charts

    echo "Deploying kube-prometheus-stack"
    helm upgrade -i kube-prometheus-stack prometheus-community/kube-prometheus-stack \
      -n monitoring --create-namespace \
      --version 69.8.2 \
      -f ./kind-cluster/apps/infrastructure/monitoring/helm/kube-prometheus-stack.yaml --timeout 20m && \
    echo "Deploying dashboards" && \
    kubectl -n monitoring apply -k ./kind-cluster/apps/infrastructure/monitoring/dashboards
}

function infra_monitoring_wait() {
  echo "Waiting for kube-prometheus-stack to be ready"
  wait_for_app "monitoring" "app.kubernetes.io/instance=kube-prometheus-stack" && \
  wait_for_app "monitoring" "app.kubernetes.io/instance=kube-prometheus-stack-prometheus" && \
  wait_for_app "monitoring" "app.kubernetes.io/instance=kube-prometheus-stack-alertmanager"
}

function infra_monitoring_delete() {
  echo "Deleting kube-prometheus-stack"
  helm -n monitoring uninstall kube-prometheus-stack
}

# Logging: LOKI + PROMTAIL
function infra_logging_deploy() {
    echo "Deploying Loki and Promtail"

    # LOKI (no dependencies)
    kubectl -n monitoring apply -k ./kind-cluster/apps/infrastructure/openframe-loki/manifests && \
    kubectl -n monitoring apply -k ./kind-cluster/apps/infrastructure/openframe-promtail/manifests
    # or
    # helm repo add grafana https://grafana.github.io/helm-charts && \
    # helm upgrade --install loki grafana/loki-stack \
    #   --version 2.10.2 \
    #   -f ./kind-cluster/apps/infrastructure/loki/helm/loki-stack.yaml

    # helm upgrade --install loki grafana/loki \
    #   --version 6.28.0 \
    #   -f ./kind-cluster/apps/infrastructure/loki/helm/loki.yaml

    # helm upgrade --install promtail grafana/promtail \
    #   --version 6.16.6 \
    #   -f ./kind-cluster/apps/infrastructure/promtail/helm/promtail.yaml
}

function infra_logging_wait() {
  echo "Waiting for logging stack to be ready"
  wait_for_app "monitoring" "app=openframe-loki" && \
  wait_for_app "monitoring" "app=openframe-promtail"
}

function infra_logging_delete() {
  echo "Deleting logging stack"
  kubectl -n monitoring delete -k ./kind-cluster/apps/infrastructure/openframe-promtail/manifests
  kubectl -n monitoring delete -k ./kind-cluster/apps/infrastructure/openframe-loki/manifests
}

# Logging: EFK
function infra_efk_deploy() {
  helm_repo_ensure elastic https://helm.elastic.co
  helm_repo_ensure fluent https://fluent.github.io/helm-charts

  echo "Deploying EFK stack"
  # kubectl apply -k ./kind-cluster/apps/infrastructure/logging/manifests && \
  # helm upgrade -i es elastic/elasticsearch \
  #   --version 8.5.1 \
  #   -f ./kind-cluster/apps/infrastructure/logging/helm/es.yaml
  # kubectl wait --for=condition=Ready pod -l release=es --timeout 20m

  # helm upgrade -i fluent-bit fluent/fluent-bit \
  #   --version 0.48.8 \
  #   -f ./kind-cluster/apps/infrastructure/logging/helm/fluent-bit.yaml

  # kubectl delete secrets kibana-kibana-es-token
  # kubectl delete configmap kibana-kibana-helm-scripts -n elastic
  # kubectl delete serviceaccount pre-install-kibana-kibana -n elastic
  # kubectl delete roles pre-install-kibana-kibana -n elastic
  # kubectl delete rolebindings pre-install-kibana-kibana -n elastic
  # kubectl delete job pre-install-kibana-kibana -n elastic

  # helm upgrade -i kibana elastic/kibana \
  #   --version 8.5.1 \
  #   -f ./kind-cluster/apps/infrastructure/logging/helm/kibana.yaml
}

function infra_efk_wait() {
  echo "Waiting for EFK stack to be ready"
  wait_for_app "monitoring" "relapp.kubernetes.io/name=fluent-bit" && \
  wait_for_app "monitoring" "release=kibana"
}

function infra_efk_delete() {
  echo "[TODO] Deleting EFK"
}

# REDIS (no dependencies)
function infra_redis_deploy() {
  helm_repo_ensure bitnami https://charts.bitnami.com/bitnami

  echo "Deploying Redis"
  helm upgrade -i openframe-redis bitnami/redis \
    -n infrastructure --create-namespace \
    --version 20.11.3 \
    -f ./kind-cluster/apps/infrastructure/openframe-redis/helm/redis.yaml

    # REDIS EXPORTER (depends on Redis, Loki)
    # TODO: service montor enabled in redis chart directly, no need to istall this one
    # helm repo add prometheus-community https://prometheus-community.github.io/helm-charts && \
    # helm upgrade -i prometheus-redis-exporter prometheus-community/prometheus-redis-exporter \
    #   --version 6.9.0 \
    #   -f ./kind-cluster/apps/infrastructure/prometheus-redis-exporter/helm/prometheus-redis-exporter.yaml
    # kubectl wait --for=condition=Ready pod -l app.kubernetes.io/name=prometheus-redis-exporter --timeout 20m
}

function infra_redis_wait() {
  echo "Waiting for Redis to be ready"
  wait_for_app "infrastructure" "app.kubernetes.io/instance=openframe-redis"
}

function infra_redis_delete() {
  echo "Deleting Redis"
  helm -n infrastructure uninstall openframe-redis
}

# KAFKA
function infra_kafka_deploy() {
  helm_repo_ensure bitnami https://charts.bitnami.com/bitnami

  echo "Deploying Kafka"
    # TODO: increase memory limit for kafka-controller
  helm upgrade -i openframe-kafka bitnami/kafka \
    -n infrastructure --create-namespace \
    --version 31.5.0 \
    -f ./kind-cluster/apps/infrastructure/openframe-kafka/helm/kafka.yaml
}

function infra_kafka_wait() {
  echo "Waiting for Kafka to be ready"
  wait_for_app "infrastructure" "app.kubernetes.io/instance=openframe-kafka"
}

function infra_kafka_delete() {
  echo "Deleting Kafka"
  helm -n infrastructure uninstall openframe-kafka
}

# MONGO
function infra_mongodb_deploy() {
  # helm_repo_ensure bitnami https://charts.bitnami.com/bitnami

  echo "Deploying MongoDB"
  kubectl -n infrastructure apply -f ./kind-cluster/apps/infrastructure/openframe-mongodb/mongodb.yaml

  # kubectl -n infrastructure create secret generic openframe-mongodb-secrets \
  #   --from-literal=mongodb-root-password=password123456789 \
  #   --from-literal=mongodb-passwords=password123456789 \
  #   --from-literal=mongodb-replica-set-key=MwfJv7CxZ1 \
  #   --dry-run=client -o yaml | kubectl apply -f - && \
  # helm upgrade -i openframe-mongodb bitnami/mongodb \
  #   --namespace infrastructure --create-namespace \
  #   --version 16.4.12 \
  #   -f ./kind-cluster/apps/infrastructure/openframe-mongodb/helm/bitnami-values.yaml
}

function infra_mongodb_wait() {
  echo "Waiting for MongoDB to be ready"
  wait_for_app "infrastructure" "app=openframe-mongodb"
}

function infra_mongodb_delete() {
  echo "Deleting MongoDB"
  kubectl -n infrastructure delete -f ./kind-cluster/apps/infrastructure/openframe-mongodb/mongodb.yaml
}

# MONGO EXPORTER
function infra_mongodb_exporter_deploy() {
  helm_repo_ensure prometheus-community https://prometheus-community.github.io/helm-charts

  echo "Deploying MongoDB Exporter"
  helm upgrade -i prometheus-mongodb-exporter prometheus-community/prometheus-mongodb-exporter \
    -n infrastructure --create-namespace \
    --version 3.11.1 \
    -f ./kind-cluster/apps/infrastructure/prometheus-mongodb-exporter/helm/prometheus-mongodb-exporter.yaml
}

function infra_mongodb_exporter_wait() {
  echo "Waiting for MongoDB Exporter to be ready"
  wait_for_app "infrastructure" "app.kubernetes.io/instance=prometheus-mongodb-exporter"
}

function infra_mongodb_exporter_delete() {
  echo "Deleting MongoDB Exporter"
  helm -n infrastructure uninstall prometheus-mongodb-exporter
}

# CASSANDRA
function infra_cassandra_deploy() {
  helm_repo_ensure bitnami https://charts.bitnami.com/bitnami

  echo "Deploying Cassandra"
  # TODO: replace with bitnami/cassandra and remove docker build and files
  # kubectl -n infrastructure apply -f ./kind-cluster/apps/infrastructure/openframe-cassandra/cassandra.yaml
  helm upgrade -i openframe-cassandra bitnami/cassandra \
    -n infrastructure --create-namespace \
    --version 12.2.1 \
    -f ./kind-cluster/apps/infrastructure/openframe-cassandra/helm/bitnami-cassandra.yaml
}

function infra_cassandra_wait() {
  echo "Waiting for Cassandra to be ready"
  wait_for_app "infrastructure" "app.kubernetes.io/instance=openframe-cassandra"
}

function infra_cassandra_delete() {
  echo "Deleting Cassandra"
  # kubectl -n infrastructure delete -k ./kind-cluster/apps/infrastructure/openframe-cassandra/manifests
  helm -n infrastructure uninstall openframe-cassandra
}

# NiFi
function infra_nifi_deploy() {
  echo "Deploying NiFi"
  kubectl -n infrastructure apply -k ./kind-cluster/apps/infrastructure/openframe-nifi
}

function infra_nifi_wait() {
  echo "Waiting for NiFi to be ready"
  wait_for_app "infrastructure" "app=openframe-nifi"
}

function infra_nifi_delete() {
  echo "Deleting NiFi"
  kubectl -n infrastructure delete -k ./kind-cluster/apps/infrastructure/openframe-nifi
}

# ZOOKEEPER
function infra_zookeeper_deploy() {
  echo "Deploying Zookeeper"

  # helm_repo_ensure bitnami https://charts.bitnami.com/bitnami
  # https://alex.dzyoba.com/blog/jmx-exporter/
  # TODO: replace with bitnami/zookeeper and exporter with chart metrics
  # helm upgrade -i zookeeper bitnami/zookeeper \
  #   --version 13.7.4 \
  #   -f ./kind-cluster/apps/infrastructure/zookeeper/helm/zookeeper.yaml
  kubectl -n infrastructure apply -k ./kind-cluster/apps/infrastructure/zookeeper/manifests
}

function infra_zookeeper_wait() {
  echo "Waiting for Zookeeper to be ready"
  wait_for_app "infrastructure" "app=zookeeper"
}

function infra_zookeeper_delete() {
  echo "Deleting Zookeeper"
  kubectl -n infrastructure delete -k ./kind-cluster/apps/infrastructure/zookeeper/manifests
}

# PINOT
function infra_pinot_deploy() {
  echo "Deploying Pinot"
  # Pinot Controller (depends on Zookeeper)
  # Pinot Broker (depends on Pinot Controller)
  # Pinot Server (depends on Pinot Controller)
  kubectl -n infrastructure apply -k ./kind-cluster/apps/infrastructure/openframe-pinot/manifests

  # helm_repo_ensure openframe-pinot https://raw.githubusercontent.com/apache/pinot/master/helm
  # helm upgrade -i pinot pinot/pinot \
  #     -n infrastructure --create-namespace \
  #     --version 0.3.1
}

function infra_pinot_wait() {
  echo "Waiting for Pinot to be ready"
  wait_for_app "infrastructure" "app=openframe-pinot"
}

function infra_pinot_delete() {
  echo "Deleting Pinot"
  kubectl -n infrastructure delete -k ./kind-cluster/apps/infrastructure/openframe-pinot/manifests
}

# OPENFRAME CONFIG SERVER
function infra_config_server_deploy() {
  echo "Deploying Config Server"
  kubectl -n infrastructure apply -k ./kind-cluster/apps/infrastructure/openframe-config
}

function infra_config_server_wait() {
  echo "Waiting for Config Server to be ready"
  wait_for_app "infrastructure" "app=openframe-config-server"
}

function infra_config_server_delete() {
  echo "Deleting Config Server"
  kubectl -n infrastructure delete -k ./kind-cluster/apps/infrastructure/openframe-config
}

# OPENFRAME API
function infra_api_deploy() {
  echo "Deploying API"
  kubectl -n infrastructure apply -k ./kind-cluster/apps/infrastructure/openframe-api
}

function infra_api_wait() {
  echo "Waiting for API to be ready"
  wait_for_app "infrastructure" "app=openframe-api"
}

function infra_api_delete() {
  echo "Deleting API"
  kubectl -n infrastructure delete -k ./kind-cluster/apps/infrastructure/openframe-api
}

# OPENFRAME MANAGEMENT (depends on Config Server, MongoDB)
function infra_management_deploy() {
  echo "Deploying Management"
  kubectl -n infrastructure apply -k ./kind-cluster/apps/infrastructure/openframe-management
}

function infra_management_wait() {
  echo "Waiting for Management to be ready"
  wait_for_app "infrastructure" "app=openframe-management"
}

function infra_management_delete() {
  echo "Deleting Management"
  kubectl -n infrastructure delete -k ./kind-cluster/apps/infrastructure/openframe-management
}

# OPENFRAME STREAM (depends on Kafka, Config Server, Cassandra, MongoDB, Loki)
function infra_stream_deploy() {
  echo "Deploying Stream"
  kubectl -n infrastructure apply -k ./kind-cluster/apps/infrastructure/openframe-stream
}

function infra_stream_wait() {
  echo "Waiting for Stream to be ready"
  wait_for_app "infrastructure" "app=openframe-stream"
}

function infra_stream_delete() {
  echo "Deleting Stream"
  kubectl -n infrastructure delete -k ./kind-cluster/apps/infrastructure/openframe-stream
}

# OPENFRAME GATEWAY (depends on Config Server, MongoDB)
function infra_gateway_deploy() {
  echo "Deploying Gateway"
  kubectl -n infrastructure apply -k ./kind-cluster/apps/infrastructure/openframe-gateway
}

function infra_gateway_wait() {
  echo "Waiting for Gateway to be ready"
  wait_for_app "infrastructure" "app=openframe-gateway"
}

function infra_gateway_delete() {
  echo "Deleting Gateway"
  kubectl -n infrastructure delete -k ./kind-cluster/apps/infrastructure/openframe-gateway
}

# OPENFRAME UI (depends on API, Management)
function infra_openframe_ui_deploy() {
  echo "Deploying UI"
  kubectl -n infrastructure apply -f ./kind-cluster/apps/infrastructure/openframe-ui/openframe-ui.yaml
}

function infra_openframe_ui_wait() {
  echo "Waiting for UI to be ready"
  wait_for_app "infrastructure" "app=openframe-ui"
}

function infra_openframe_ui_delete() {
  echo "Deleting Infrastructure"
  kubectl -n infrastructure delete -f ./kind-cluster/apps/infrastructure/openframe-ui/openframe-ui.yaml
}
