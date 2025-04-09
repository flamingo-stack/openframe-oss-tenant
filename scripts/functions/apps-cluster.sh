#!/bin/bash

# INGRESS-NGINX
function cluster_ingress_nginx_deploy() {
  helm_repo_ensure "ingress-nginx" "https://kubernetes.github.io/ingress-nginx"

  echo "Deploying ingress-nginx"
  helm upgrade -i ingress-nginx ingress-nginx/ingress-nginx \
    -n ingress-nginx --create-namespace \
    --version 4.12.0 \
    -f ./kind-cluster/apps/infrastructure/ingress-nginx/helm/ingress-nginx.yaml
}

function cluster_ingress_nginx_wait() {
  echo "Waiting for ingress-nginx to be ready"
  wait_for_app "ingress-nginx" "app.kubernetes.io/instance=ingress-nginx"
}

# Monitoring: GRAFANA + PROMETHEUS
function cluster_monitoring_deploy() {
    helm_repo_ensure prometheus-community https://prometheus-community.github.io/helm-charts

    echo "Deploying kube-prometheus-stack"
    helm upgrade -i kube-prometheus-stack prometheus-community/kube-prometheus-stack \
      -n monitoring --create-namespace \
      --version 69.8.2 \
      -f ./kind-cluster/apps/infrastructure/monitoring/helm/kube-prometheus-stack.yaml --timeout 20m && \
    echo "Deploying dashboards" && \
    kubectl -n monitoring apply -k ./kind-cluster/apps/infrastructure/monitoring/dashboards
}

function cluster_monitoring_wait() {
  echo "Waiting for kube-prometheus-stack to be ready"
  wait_for_app "monitoring" "app.kubernetes.io/instance=kube-prometheus-stack" && \
  wait_for_app "monitoring" "app.kubernetes.io/instance=kube-prometheus-stack-prometheus" && \
  wait_for_app "monitoring" "app.kubernetes.io/instance=kube-prometheus-stack-alertmanager"
}

function cluster_monitoring_delete() {
  echo "Deleting kube-prometheus-stack"
  helm -n monitoring uninstall kube-prometheus-stack
}

# Logging: LOKI + PROMTAIL
function cluster_logging_deploy() {
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

function cluster_logging_wait() {
  echo "Waiting for logging stack to be ready"
  wait_for_app "monitoring" "app=openframe-loki" && \
  wait_for_app "monitoring" "app=openframe-promtail"
}

function cluster_logging_delete() {
  echo "Deleting logging stack"
  kubectl -n monitoring delete -k ./kind-cluster/apps/infrastructure/openframe-promtail/manifests
  kubectl -n monitoring delete -k ./kind-cluster/apps/infrastructure/openframe-loki/manifests
}

# Logging: EFK
function cluster_efk_deploy() {
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

function cluster_efk_wait() {
  echo "Waiting for EFK stack to be ready"
  wait_for_app "monitoring" "relapp.kubernetes.io/name=fluent-bit" && \
  wait_for_app "monitoring" "release=kibana"
}

function cluster_efk_delete() {
  echo "[TODO] Deleting EFK"
}

# METRICS-SERVER
function cluster_metrics_server_deploy() {
    helm_repo_ensure metrics-server https://kubernetes-sigs.github.io/metrics-server

    echo "Deploying metrics-server"
    helm upgrade -i metrics-server metrics-server/metrics-server \
      --namespace kube-system --set 'args={--kubelet-insecure-tls}'
}

function cluster_metrics_server_wait() {
  echo "Waiting for metrics-server to be ready"
  wait_for_app "kube-system" "app.kubernetes.io/instance=metrics-server"
}

function cluster_metrics_server_delete() {
  echo "Deleting metrics-server"
  helm -n kube-system uninstall metrics-server
}
