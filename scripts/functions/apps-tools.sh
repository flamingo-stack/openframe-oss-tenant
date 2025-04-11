#!/bin/bash

# TELEPRESENCE
function tools_telepresence_deploy() {
  echo "Deploying telepresence"
  brew install telepresenceio/telepresence/telepresence-oss
  telepresence helm install && telepresence connect
}

function tools_telepresence_wait() {
  echo "Waiting for telepresence to be ready"
  wait_for_app "ambassador" "app=traffic-manager"
}

function tools_telepresence_delete() {
  echo "Deleting telepresence"
  telepresence quit
  telepresence helm uninstall
  kubectl delete namespace ambassador
}

# KAFKA UI
function tools_kafka_ui_deploy() {
  helm_repo_ensure kafbat-ui https://kafbat.github.io/helm-charts

  echo "Deploying Kafka UI"
  helm upgrade -i kafka-ui kafbat-ui/kafka-ui \
    -n infrastructure --create-namespace \
    --version 1.4.12 \
    -f ./kind-cluster/apps/infrastructure/kafka-ui/helm/kafka-ui.yaml
}

function tools_kafka_ui_wait() {
  echo "Waiting for Kafka UI to be ready"
  wait_for_app "infrastructure" "app.kubernetes.io/name=kafka-ui"
}

function tools_kafka_ui_delete() {
  echo "Deleting Kafka UI"
  helm delete kafka-ui -n infrastructure
}

# MONGO EXPRESS (UI)
function tools_mongo_express_deploy() {
  echo "Deploying Mongo Express (UI)"
    kubectl -n infrastructure apply -f ./kind-cluster/apps/infrastructure/mongo-express/mongo-express.yaml
}

function tools_mongo_express_wait() {
  echo "Waiting for Mongo Express (UI) to be ready"
  wait_for_app "infrastructure" "app=mongo-express"
}

function tools_mongo_express_delete() {
  echo "Deleting Mongo Express (UI)"
  kubectl -n infrastructure delete -f ./kind-cluster/apps/infrastructure/mongo-express/mongo-express.yaml
}
