#!/bin/bash

# INGRESS-NGINX
function platform_ingress_nginx_deploy() {
  helm_repo_ensure "ingress-nginx" "https://kubernetes.github.io/ingress-nginx"

  echo "Deploying ingress-nginx"
  helm upgrade -i ingress-nginx ingress-nginx/ingress-nginx \
    -n platform --create-namespace \
    --version 4.12.1 \
    -f ${ROOT_REPO_DIR}/kind-cluster/apps/platform/ingress-nginx/helm/values.yaml \
    --wait --timeout 1h
}

function platform_ingress_nginx_wait() {
  echo "Waiting for ingress-nginx to be ready"
  wait_for_app "platform" "app.kubernetes.io/instance=ingress-nginx"
}

function platform_ingress_nginx_delete() {
  echo "Deleting ingress-nginx"
  helm -n platform uninstall ingress-nginx
}

# METRICS-SERVER
function platform_metrics_server_deploy() {
  helm_repo_ensure metrics-server https://kubernetes-sigs.github.io/metrics-server

  echo "Deploying metrics-server"
  helm upgrade -i metrics-server metrics-server/metrics-server \
    --namespace kube-system --set 'args={--kubelet-insecure-tls}' \
  --wait --timeout 1h
}

function platform_metrics_server_wait() {
  echo "Waiting for metrics-server to be ready"
  wait_for_app "kube-system" "app.kubernetes.io/instance=metrics-server"
}

function platform_metrics_server_delete() {
  echo "Deleting metrics-server"
  helm -n kube-system uninstall metrics-server
}

# Monitoring: GRAFANA + PROMETHEUS
function platform_monitoring_deploy() {
  helm_repo_ensure prometheus-community https://prometheus-community.github.io/helm-charts

  echo "Deploying kube-prometheus-stack"
  helm upgrade -i kube-prometheus-stack prometheus-community/kube-prometheus-stack \
    -n platform --create-namespace \
    --version 70.4.2 \
    -f ${ROOT_REPO_DIR}/kind-cluster/apps/platform/monitoring/helm/values.yaml  \
    --wait --timeout 1h && \
  echo "Deploying dashboards" && \
  kubectl -n platform apply -k ${ROOT_REPO_DIR}/kind-cluster/apps/platform/monitoring/dashboards
}

function platform_monitoring_wait() {
  echo "Waiting for kube-prometheus-stack to be ready"
  wait_for_app "platform" "app.kubernetes.io/instance=kube-prometheus-stack" && \
  wait_for_app "platform" "app.kubernetes.io/instance=kube-prometheus-stack-prometheus" && \
  wait_for_app "platform" "app.kubernetes.io/instance=kube-prometheus-stack-alertmanager"
}

function platform_monitoring_delete() {
  echo "Deleting kube-prometheus-stack"
  helm -n platform uninstall kube-prometheus-stack
}

# Logging: LOKI + PROMTAIL
function platform_logging_deploy() {
  echo "Deploying Loki and Promtail"

  # LOKI (no dependencies)
  kubectl -n platform apply -k ${ROOT_REPO_DIR}/kind-cluster/apps/platform/openframe-loki/manifests && \
  kubectl -n platform apply -k ${ROOT_REPO_DIR}/kind-cluster/apps/platform/openframe-promtail/manifests
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

function platform_logging_wait() {
  echo "Waiting for logging stack to be ready"
  wait_for_app "platform" "app=openframe-loki" && \
  wait_for_app "platform" "app=openframe-promtail"
}

function platform_logging_delete() {
  echo "Deleting logging stack"
  kubectl -n platform delete -k ${ROOT_REPO_DIR}/kind-cluster/apps/platform/promtail/manifests
  kubectl -n platform delete -k ${ROOT_REPO_DIR}/kind-cluster/apps/platform/loki/manifests
}

# Logging: EFK
function platform_efk_deploy() {
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

function platform_efk_wait() {
  echo "Waiting for EFK stack to be ready"
  wait_for_app "platform" "relapp.kubernetes.io/name=fluent-bit" && \
  wait_for_app "platform" "release=kibana"
}

function platform_efk_delete() {
  echo "[TODO] Deleting EFK"
}

# CERT-MANAGER
function platform_cert_manager_deploy() {
  echo "Deploying cert-manager"
  helm_repo_ensure jetstack https://charts.jetstack.io

  helm upgrade -i cert-manager jetstack/cert-manager \
    --namespace platform --create-namespace \
    --version v1.17.1 \
    -f ${ROOT_REPO_DIR}/kind-cluster/apps/platform/cert-manager/helm/values.yaml \
    --wait --timeout 1h

  # Create cert-manager namespace if it doesn't exist
  kubectl create namespace cert-manager --dry-run=client -o yaml | kubectl apply -f -

  # Create CA secret
  echo "Creating CA secret"
  kubectl create secret generic ca-secret \
    --namespace platform \
    --from-file=tls.crt=${ROOT_REPO_DIR}/scripts/files/ca/ca.crt \
    --from-file=tls.key=${ROOT_REPO_DIR}/scripts/files/ca/ca.key \
    --dry-run=client -o yaml | kubectl apply -f -

  # Create Issuer
  echo "Creating Issuers"
  kubectl apply -k ${ROOT_REPO_DIR}/kind-cluster/apps/platform/cert-manager/manifests
}

function platform_cert_manager_wait() {
  echo "Waiting for cert-manager to be ready"
  wait_for_app "platform" "app.kubernetes.io/instance=cert-manager"
}

function platform_cert_manager_delete() {
  echo "Deleting cert-manager"
}

# Wait for all cluster apps to be ready
function platform_wait_all() {
  platform_cert_manager_wait && \
  platform_ingress_nginx_wait && \
  platform_metrics_server_wait && \
  platform_monitoring_wait && \
  platform_logging_wait
}
