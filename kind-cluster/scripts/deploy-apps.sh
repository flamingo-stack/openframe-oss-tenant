#!/bin/bash

# Deploy ingress-nginx
helm upgrade -i ingress-nginx ingress-nginx/ingress-nginx \
  -n ingress-nginx --create-namespace \
  --version 4.12.0 \
  -f ./kind-cluster/apps/ingress-nginx/helm/ingress-nginx.yaml

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

helm upgrade -i kube-prometheus-stack prometheus-community/kube-prometheus-stack \
  -n monitoring --create-namespace \
  --version 69.8.2 \
  -f ./kind-cluster/apps/monitoring/helm/kube-prometheus-stack.yaml

kubectl -n monitoring wait --for=condition=Ready pod -l release=kube-prometheus-stack

kubectl apply -n monitoring -k ./kind-cluster/apps/monitoring/manifests/dashboards

# Logging
# KIBANA_FQDN="kibana.$DOMAIN"
# KIBANA_ENTRY="${IP} ${KIBANA_FQDN}"
# if ! grep -qF "$KIBANA_ENTRY" "$HOSTS_FILE"; then
#     echo "$KIBANA_ENTRY" | sudo tee -a "$HOSTS_FILE"
# fi
# kubectl apply -k ./kind-cluster/apps/logging/manifests

# helm upgrade -i es elastic/elasticsearch \
#   -n logging --create-namespace \
#   --version 8.5.1 \
#   -f ./kind-cluster/apps/logging/helm/es.yaml

# sudo sysctl fs.inotify.max_user_instances=1024
# sudo sysctl -p

# helm upgrade -i fluent-bit fluent/fluent-bit \
#   -n logging --create-namespace \
#   --version 0.48.8 \
#   -f ./kind-cluster/apps/logging/helm/fluent-bit.yaml

# kubectl -n logging delete secrets kibana-kibana-es-token
# kubectl -n logging delete configmap kibana-kibana-helm-scripts -n elastic
# kubectl -n logging delete serviceaccount pre-install-kibana-kibana -n elastic
# kubectl -n logging delete roles pre-install-kibana-kibana -n elastic
# kubectl -n logging delete rolebindings pre-install-kibana-kibana -n elastic
# kubectl -n logging delete job pre-install-kibana-kibana -n elastic

# helm upgrade -i kibana elastic/kibana \
#   -n logging --create-namespace \
#   --version 8.5.1 \
#   -f ./kind-cluster/apps/logging/helm/kibana.yaml --no-hooks
