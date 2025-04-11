#!/bin/bash

# REDIS
function openframe_datasources_redis_deploy() {
  helm_repo_ensure bitnami https://charts.bitnami.com/bitnami

  echo "Deploying Redis"
  helm upgrade -i openframe-redis bitnami/redis \
    -n openframe-datasources --create-namespace \
    --version 20.11.3 \
    -f ${ROOT_REPO_DIR}/kind-cluster/apps/openframe-datasources/openframe-redis/helm/redis.yaml

    # REDIS EXPORTER
    # TODO: service montor enabled in redis chart directly, no need to istall this one
    # helm repo add prometheus-community https://prometheus-community.github.io/helm-charts && \
    # helm upgrade -i prometheus-redis-exporter prometheus-community/prometheus-redis-exporter \
    #   --version 6.9.0 \
    #   -f ./kind-cluster/apps/openframe-datasources/prometheus-redis-exporter/helm/prometheus-redis-exporter.yaml
    # kubectl wait --for=condition=Ready pod -l app.kubernetes.io/name=prometheus-redis-exporter --timeout 20m
}

function openframe_datasources_redis_wait() {
  echo "Waiting for Redis to be ready"
  wait_for_app "openframe-datasources" "app.kubernetes.io/instance=openframe-redis"
}

function openframe_datasources_redis_delete() {
  echo "Deleting Redis"
  helm -n openframe-datasources uninstall openframe-redis
}

# KAFKA
function openframe_datasources_kafka_deploy() {
  helm_repo_ensure bitnami https://charts.bitnami.com/bitnami

  echo "Deploying Kafka"
    # TODO: increase memory limit for kafka-controller
  helm upgrade -i openframe-kafka bitnami/kafka \
    -n openframe-datasources --create-namespace \
    --version 31.5.0 \
    -f ${ROOT_REPO_DIR}/kind-cluster/apps/openframe-datasources/openframe-kafka/helm/kafka.yaml
}

function openframe_datasources_kafka_wait() {
  echo "Waiting for Kafka to be ready"
  wait_for_app "openframe-datasources" "app.kubernetes.io/instance=openframe-kafka"
}

function openframe_datasources_kafka_delete() {
  echo "Deleting Kafka"
  helm -n openframe-datasources uninstall openframe-kafka
}

# MONGO
function openframe_datasources_mongodb_deploy() {
  # helm_repo_ensure bitnami https://charts.bitnami.com/bitnami

  echo "Deploying MongoDB"
  kubectl -n openframe-datasources apply -k ${ROOT_REPO_DIR}/kind-cluster/apps/openframe-datasources/openframe-mongodb/manifests

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

function openframe_datasources_mongodb_wait() {
  echo "Waiting for MongoDB to be ready"
  wait_for_app "openframe-datasources" "app=openframe-mongodb"
}

function openframe_datasources_mongodb_delete() {
  echo "Deleting MongoDB"
  kubectl -n openframe-datasources delete -k ${ROOT_REPO_DIR}/kind-cluster/apps/openframe-datasources/openframe-mongodb/manifests
}

# MONGO EXPORTER
function openframe_datasources_mongodb_exporter_deploy() {
  helm_repo_ensure prometheus-community https://prometheus-community.github.io/helm-charts

  echo "Deploying MongoDB Exporter"
  helm upgrade -i prometheus-mongodb-exporter prometheus-community/prometheus-mongodb-exporter \
    -n openframe-datasources --create-namespace \
    --version 3.11.1 \
    -f ${ROOT_REPO_DIR}/kind-cluster/apps/openframe-datasources/prometheus-mongodb-exporter/helm/prometheus-mongodb-exporter.yaml
}

function openframe_datasources_mongodb_exporter_wait() {
  echo "Waiting for MongoDB Exporter to be ready"
  wait_for_app "openframe-datasources" "app.kubernetes.io/instance=prometheus-mongodb-exporter"
}

function openframe_datasources_mongodb_exporter_delete() {
  echo "Deleting MongoDB Exporter"
  helm -n openframe-datasources uninstall prometheus-mongodb-exporter
}

# CASSANDRA
function openframe_datasources_cassandra_deploy() {
  helm_repo_ensure bitnami https://charts.bitnami.com/bitnami

  echo "Deploying Cassandra"
  helm upgrade -i openframe-cassandra bitnami/cassandra \
    -n openframe-datasources --create-namespace \
    --version 12.2.1 \
    -f ${ROOT_REPO_DIR}/kind-cluster/apps/openframe-datasources/openframe-cassandra/helm/bitnami-cassandra.yaml
}

function openframe_datasources_cassandra_wait() {
  echo "Waiting for Cassandra to be ready"
  wait_for_app "openframe-datasources" "app.kubernetes.io/instance=openframe-cassandra"
}

function openframe_datasources_cassandra_delete() {
  echo "Deleting Cassandra"
  helm -n openframe-datasources uninstall openframe-cassandra
}

# NiFi
function openframe_datasources_nifi_deploy() {
  echo "Deploying NiFi"
  kubectl -n openframe-datasources apply -k ./kind-cluster/apps/openframe-datasources/openframe-nifi
}

function openframe_datasources_nifi_wait() {
  echo "Waiting for NiFi to be ready"
  wait_for_app "openframe-datasources" "app=openframe-nifi"
}

function openframe_datasources_nifi_delete() {
  echo "Deleting NiFi"
  kubectl -n openframe-datasources delete -k ./kind-cluster/apps/openframe-datasources/openframe-nifi
}

# ZOOKEEPER
function openframe_datasources_zookeeper_deploy() {
  echo "Deploying Zookeeper"

  # helm_repo_ensure bitnami https://charts.bitnami.com/bitnami
  # https://alex.dzyoba.com/blog/jmx-exporter/
  # TODO: replace with bitnami/zookeeper and exporter with chart metrics
  # helm upgrade -i zookeeper bitnami/zookeeper \
  #   --version 13.7.4 \
  #   -f ./kind-cluster/apps/infrastructure/zookeeper/helm/zookeeper.yaml
  kubectl -n openframe-datasources apply -k ./kind-cluster/apps/openframe-datasources/openframe-zookeeper/manifests
}

function openframe_datasources_zookeeper_wait() {
  echo "Waiting for Zookeeper to be ready"
  wait_for_app "openframe-datasources" "app=zookeeper"
}

function openframe_datasources_zookeeper_delete() {
  echo "Deleting Zookeeper"
  kubectl -n openframe-datasources delete -k ./kind-cluster/apps/openframe-datasources/openframe-zookeeper/manifests
}

# Wait for all openframe-datasources apps to be ready
function openframe_datasources_wait_all() {
  openframe_datasources_redis_wait
  openframe_datasources_kafka_wait
  openframe_datasources_mongodb_wait
  openframe_datasources_mongodb_exporter_wait
  openframe_datasources_cassandra_wait
  openframe_datasources_zookeeper_wait
  openframe_datasources_nifi_wait
}
