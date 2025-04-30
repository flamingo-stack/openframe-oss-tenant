#!/bin/bash

# TELEPRESENCE
function tools_telepresence_wait() {
  echo "Waiting for telepresence to be ready"
  wait_for_app "client-tools" "app=traffic-manager"
}

function tools_telepresence_deploy() {
  echo "Checking telepresence status" &&
    if ! helm -n client-tools list | grep -q "traffic-manager.*"; then
      echo "Installing telepresence" &&
        [ -d $HOME/.config/telepresence ] || mkdir -p $HOME/.config/telepresence
      if [ ! -f $HOME/.config/telepresence/config.yml ]; then
        cp $HOME/.config/telepresence/config.yml $HOME/.config/telepresence/config.yml.bak
      fi

      tee $HOME/.config/telepresence/config.yml <<EOF
timeouts:
  helm: 1200s
EOF
      telepresence helm install -n client-tools
    else
      echo "Telepresence is already installed"
    fi

  if ! telepresence status | grep -q "OSS Traffic Manager: Connected"; then
    echo "Connecting telepresence" &&
      tools_telepresence_wait && telepresence connect
  else
    echo "Telepresence is already connected"
  fi
}

function tools_telepresence_delete() {
  echo "Deleting telepresence"
  telepresence quit
  telepresence helm uninstall
  kubectl delete namespace client-tools
}

# KAFKA UI
function tools_kafka_ui_deploy() {
  helm_repo_ensure kafbat-ui https://kafbat.github.io/helm-charts &&
    echo "Deploying Kafka UI" &&
    helm upgrade -i kafka-ui kafbat-ui/kafka-ui \
      -n client-tools --create-namespace \
      --version 1.4.12 \
      -f ${ROOT_REPO_DIR}/deploy/dev/client-tools/kafka-ui/helm/kafka-ui.yaml \
      --wait --timeout 1h
}

function tools_kafka_ui_wait() {
  echo "Waiting for Kafka UI to be ready"
  wait_for_app "client-tools" "app.kubernetes.io/name=kafka-ui"
}

function tools_kafka_ui_delete() {
  echo "Deleting Kafka UI"
  helm delete kafka-ui -n client-tools
}

# MONGO EXPRESS (UI)
function tools_mongo_express_deploy() {
  echo "Deploying Mongo Express (UI)" &&
    kubectl -n client-tools apply -f ${ROOT_REPO_DIR}/deploy/dev/client-tools/mongo-express/mongo-express.yaml
}

function tools_mongo_express_wait() {
  echo "Waiting for Mongo Express (UI) to be ready"
  wait_for_app "client-tools" "app=mongo-express"
}

function tools_mongo_express_delete() {
  echo "Deleting Mongo Express (UI)"
  kubectl -n client-tools delete -f ${ROOT_REPO_DIR}/deploy/dev/client-tools/mongo-express/mongo-express.yaml
}
