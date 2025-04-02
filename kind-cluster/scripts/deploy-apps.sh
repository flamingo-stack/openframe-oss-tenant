#!/bin/bash

# PULL SECRETS
kubectl create namespace infrastructure --dry-run=client -o yaml | kubectl apply -f -  && \
kubectl -n infrastructure create secret docker-registry github-pat-secret \
  --docker-server=ghcr.io \
  --docker-username=vusal-fl \
  --docker-password=$(echo -n $GITHUB_TOKEN_CLASSIC) \
  --docker-email=vusal@flamingo.cx --dry-run=client -o yaml | kubectl apply -f -

case "$1" in
  telepresence)
    telepresence helm install --upgrade &&
    telepresence connect
    ;;
  ingress-nginx)
    # INGRESS-NGINX
    helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx && \
    helm upgrade -i ingress-nginx ingress-nginx/ingress-nginx \
      -n ingress-nginx --create-namespace \
      --version 4.12.0 \
      -f ./kind-cluster/apps/infrastructure/ingress-nginx/helm/ingress-nginx.yaml && \
    kubectl -n ingress-nginx wait --for=condition=Ready pod -l app.kubernetes.io/name=ingress-nginx --timeout 20m
    ;;
  grafana)
    # GRAFANA (depends on Prometheus, Loki) + PROMETHEUS (depends on Loki)
    helm repo add prometheus-community https://prometheus-community.github.io/helm-charts && \
    helm upgrade -i kube-prometheus-stack prometheus-community/kube-prometheus-stack \
      -n monitoring --create-namespace \
      --version 69.8.2 \
      -f ./kind-cluster/apps/infrastructure/monitoring/helm/kube-prometheus-stack.yaml && \
    kubectl -n monitoring wait --for=condition=Ready pod -l release=kube-prometheus-stack --timeout 20m && \
    kubectl -n monitoring apply -k ./kind-cluster/apps/infrastructure/monitoring/dashboards
    ;;
  loki)
    # ------------- INFRASTRUCTURE -------------
    # LOKI (no dependencies)
    kubectl -n monitoring apply -k ./kind-cluster/apps/infrastructure/openframe-loki/manifests
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
    ;;
  redis)
    # REDIS (no dependencies)
    helm repo add bitnami https://charts.bitnami.com/bitnami && \
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
    ;;
  efk)
    # EFK
    # kubectl apply -k ./kind-cluster/apps/infrastructure/logging/manifests && \
    # helm repo add elastic https://helm.elastic.co && \
    # helm upgrade -i es elastic/elasticsearch \
    #   --version 8.5.1 \
    #   -f ./kind-cluster/apps/infrastructure/logging/helm/es.yaml
    # kubectl wait --for=condition=Ready pod -l release=es --timeout 20m

    # helm repo add fluent https://fluent.github.io/helm-charts && \
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
    ;;
  kafka)
    # KAFKA (depends on Zookeeper, Loki)
    # TODO: increase memory limit for kafka-controller
    helm repo add bitnami https://charts.bitnami.com/bitnami && \
    helm upgrade -i openframe-kafka bitnami/kafka \
      -n infrastructure --create-namespace \
      --version 31.5.0 \
      -f ./kind-cluster/apps/infrastructure/openframe-kafka/helm/kafka.yaml
    ;;
  kafka-ui)
    # KAFKA UI (depends on Kafka, Loki)
    helm repo add kafbat-ui https://kafbat.github.io/helm-charts && \
    helm upgrade -i kafka-ui kafbat-ui/kafka-ui \
      -n infrastructure --create-namespace \
      --version 1.4.12 \
      -f ./kind-cluster/apps/infrastructure/kafka-ui/helm/kafka-ui.yaml
    ;;
  mongodb)
    # MONGO DB (depends on Loki)
    # kubectl -n infrastructure apply -f ./kind-cluster/apps/infrastructure/openframe-mongodb/mongodb.yaml

    kubectl -n infrastructure create secret generic openframe-mongodb-secrets \
      --from-literal=mongodb-root-password=password123456789 \
      --from-literal=mongodb-passwords=password123456789 \
      --from-literal=mongodb-replica-set-key=MwfJv7CxZ1 \
      --dry-run=client -o yaml | kubectl apply -f - && \
    helm repo add bitnami https://charts.bitnami.com/bitnami && \
    helm upgrade -i openframe-mongodb bitnami/mongodb \
      --namespace infrastructure --create-namespace \
      --version 16.4.12 \
      -f ./kind-cluster/apps/infrastructure/openframe-mongodb/helm/bitnami-values.yaml
    ;;
  mongodb-exporter)
    # MONGO EXPORTER (depends on MongoDB, Loki)
    helm upgrade -i prometheus-mongodb-exporter prometheus-community/prometheus-mongodb-exporter \
      -n infrastructure --create-namespace \
      --version 3.11.1 \
      -f ./kind-cluster/apps/infrastructure/prometheus-mongodb-exporter/helm/prometheus-mongodb-exporter.yaml
    ;;
  mongo-express)
    # MONGO EXPRESS (depends on MongoDB, Loki)
    kubectl -n infrastructure apply -f ./kind-cluster/apps/infrastructure/mongo-express/mongo-express.yaml
    ;;
  cassandra)
    # CASSANDRA (depends on Loki)
    # TODO: replace with bitnami/cassandra and remove docker build and files
    # kubectl -n infrastructure apply -f ./kind-cluster/apps/infrastructure/openframe-cassandra/cassandra.yaml && \
    # kubectl -n infrastructure wait --for=condition=Ready pod -l app=openframe-cassandra --timeout 20m

    helm repo add bitnami https://charts.bitnami.com/bitnami && \
    helm upgrade -i openframe-cassandra bitnami/cassandra \
      -n infrastructure --create-namespace \
      --version 12.2.1 \
      -f ./kind-cluster/apps/infrastructure/openframe-cassandra/helm/bitnami-cassandra.yaml
    ;;
  nifi)
    # NIFI (depends on Loki)
    # TODO: liveness probe fails, need to check
    kubectl -n infrastructure apply -k ./kind-cluster/apps/infrastructure/openframe-nifi
    ;;
  zookeeper)
    # ZOOKEEPER (for PINOTs) (depends on Loki)
    # https://alex.dzyoba.com/blog/jmx-exporter/
    # TODO: replace with bitnami/zookeeper and exporter with chart metrics
    # helm upgrade -i zookeeper bitnami/zookeeper \
    #   --version 13.7.4 \
    #   -f ./kind-cluster/apps/infrastructure/zookeeper/helm/zookeeper.yaml
    kubectl -n infrastructure apply -k ./kind-cluster/apps/infrastructure/zookeeper/manifests
    ;;
  pinot)
    # PINOT
    # Pinot Controller (depends on Zookeeper)
    # Pinot Broker (depends on Pinot Controller)
    # Pinot Server (depends on Pinot Controller)
    kubectl -n infrastructure apply -k ./kind-cluster/apps/infrastructure/openframe-pinot/manifests

    # helm repo add openframe-pinot https://raw.githubusercontent.com/apache/pinot/master/helm
    # helm upgrade -i pinot pinot/pinot \
    #     -n infrastructure --create-namespace \
    #     --version 0.3.1
    ;;
  config-server)
    # CONFIG SERVER (no dependencies)
    kubectl -n infrastructure apply -k ./kind-cluster/apps/infrastructure/openframe-config
    ;;
  api)
    # API (depends on Config Server, MongoDB, Kafka, Cassandra, Redis)
    # management-key: docker-management-key-123  ???
    kubectl -n infrastructure apply -k ./kind-cluster/apps/infrastructure/openframe-api
    ;;
  management)
    # MANAGEMENT (depends on Config Server, MongoDB)
    kubectl -n infrastructure apply -k ./kind-cluster/apps/infrastructure/openframe-management
    ;;
  stream)
    # STREAM (depends on Kafka, Config Server, Cassandra, MongoDB, Loki)
    kubectl -n infrastructure apply -k ./kind-cluster/apps/infrastructure/openframe-stream
    ;;
  gateway)
    # GATEWAY (depends on Config Server, MongoDB, Cassandra, Loki)
    kubectl -n infrastructure apply -k ./kind-cluster/apps/infrastructure/openframe-gateway
    ;;
  openframe-ui)
    # OPENFRAME UI (depends on API, Management)
    kubectl -n infrastructure apply -f ./kind-cluster/apps/infrastructure/openframe-ui/openframe-ui.yaml
    ;;
  authentik)
    # ------------- AUTHENTIK -------------
    kubectl create namespace authentik --dry-run=client -o yaml | kubectl apply -f -  && \
    kubectl -n authentik create secret docker-registry github-pat-secret \
      --docker-server=ghcr.io \
      --docker-username=vusal-fl \
      --docker-password=$(echo -n $GITHUB_TOKEN_CLASSIC) \
      --docker-email=vusal@flamingo.cx --dry-run=client -o yaml | kubectl apply -f - && \
    kubectl -n authentik apply -f ./kind-cluster/apps/authentik

    # helm upgrade -i authentik-redis authentik/redis \
    # -n authentik2 --create-namespace \
    # --version 15.7.6 \
    # -f ./kind-cluster/apps/authentik/helm/authentik/authentik-redis.yaml

    # helm upgrade -i authentik-postgresql authentik/postgresql \
    #     -n authentik2 --create-namespace \
    #     --version 12.8.2 \
    #     -f ./kind-cluster/apps/authentik/helm/authentik/authentik-postgresql.yaml

    # helm upgrade -i authentik-authentik authentik/authentik \
    #     -n authentik2 --create-namespace \
    #     --version 2025.2.1 \
    #     -f ./kind-cluster/apps/authentik/helm/authentik/authentik-authentik.yaml

    ;;
  fleet)
    # ------------- FLEET -------------
    kubectl create namespace fleet --dry-run=client -o yaml | kubectl apply -f -  && \
    kubectl -n fleet create secret docker-registry github-pat-secret \
      --docker-server=ghcr.io \
      --docker-username=vusal-fl \
      --docker-password=$(echo -n $GITHUB_TOKEN_CLASSIC) \
      --docker-email=vusal@flamingo.cx --dry-run=client -o yaml | kubectl apply -f - && \
    kubectl -n fleet apply -f ./kind-cluster/apps/fleet
    ;;
  meshcentral)
    # ------------- MESH CENTRAL -------------
    kubectl create namespace meshcentral --dry-run=client -o yaml | kubectl apply -f -  && \
    kubectl -n meshcentral create secret docker-registry github-pat-secret \
      --docker-server=ghcr.io \
      --docker-username=vusal-fl \
      --docker-password=$(echo -n $GITHUB_TOKEN_CLASSIC) \
      --docker-email=vusal@flamingo.cx --dry-run=client -o yaml | kubectl apply -f - && \
    kubectl -n meshcentral apply -f ./kind-cluster/apps/meshcentral
    ;;
  rmm)
    # ------------- RMM -------------
    kubectl create namespace tactical-rmm --dry-run=client -o yaml | kubectl apply -f -  && \
    kubectl -n tactical-rmm create secret docker-registry github-pat-secret \
      --docker-server=ghcr.io \
      --docker-username=vusal-fl \
      --docker-password=$(echo -n $GITHUB_TOKEN_CLASSIC) \
      --docker-email=vusal@flamingo.cx --dry-run=client -o yaml | kubectl apply -f - && \
    kubectl -n tactical-rmm apply -f ./kind-cluster/apps/tactical-rmm
    ;;
  register-tools)
    # ------------- REGISTER TOOLS -------------
    # kubectl -n infrastructure apply -f ./kind-cluster/apps/jobs/register-tools.yaml && \
    # kubectl -n infrastructure wait --for=condition=Ready pod -l app=register-tools --timeout 20m
    ./kind-cluster/apps/jobs/register.sh
    ;;
  a|all)
    # ------------- ALL -------------
    $0 telepresence && \
    $0 ingress-nginx && \
    $0 grafana && \
    $0 loki && \
      kubectl -n monitoring wait --for=condition=Ready pod -l app=openframe-loki --timeout 20m && \
      kubectl -n monitoring wait --for=condition=Ready pod -l app=openframe-promtail --timeout 20m && \
    $0 redis && \
      kubectl -n infrastructure wait --for=condition=Ready pod -l app.kubernetes.io/name=redis --timeout 20m && \
    $0 kafka && \
      kubectl -n infrastructure wait --for=condition=Ready pod -l app.kubernetes.io/name=kafka --timeout 20m && \
    $0 kafka-ui && \
      kubectl -n infrastructure wait --for=condition=Ready pod -l app.kubernetes.io/name=kafka-ui --timeout 20m && \
    $0 mongodb && \
      kubectl -n infrastructure wait --for=condition=Ready pod -l app=openframe-mongodb --timeout 20m && \
    $0 mongo-express && \
      kubectl -n infrastructure wait --for=condition=Ready pod -l app=mongo-express --timeout 20m && \
    $0 mongodb-exporter && \
      kubectl -n infrastructure wait --for=condition=Ready pod -l app.kubernetes.io/name=prometheus-mongodb-exporter --timeout 20m && \
    $0 cassandra && \
      kubectl -n infrastructure wait --for=condition=Ready pod -l app.kubernetes.io/name=cassandra --timeout 20m && \
    $0 nifi && \
      kubectl -n infrastructure wait --for=condition=Ready pod -l app=openframe-nifi --timeout 20m && \
    $0 zookeeper && \
      kubectl -n infrastructure wait --for=condition=Ready pod -l app=zookeeper --timeout 20m && \
    $0 pinot && \
      kubectl -n infrastructure wait --for=condition=Ready pod -l app=openframe-pinot --timeout 20m && \
    $0 config-server && \
      kubectl -n infrastructure wait --for=condition=Ready pod -l app=openframe-config-server --timeout 20m && \
    $0 api && \
      kubectl -n infrastructure wait --for=condition=Ready pod -l app=openframe-api --timeout 20m && \
    $0 management && \
      kubectl -n infrastructure wait --for=condition=Ready pod -l app=openframe-management --timeout 20m && \
    $0 stream && \
      kubectl -n infrastructure wait --for=condition=Ready pod -l app=openframe-stream --timeout 20m && \
    $0 gateway && \
      kubectl -n infrastructure wait --for=condition=Ready pod -l app=openframe-gateway --timeout 20m && \
    $0 openframe-ui && \
      kubectl -n infrastructure wait --for=condition=Ready pod -l app=openframe-ui --timeout 20m && \
    $0 authentik && \
      kubectl -n authentik wait --for=condition=Ready pod -l app=authentik-server --timeout 20m && \
      kubectl -n authentik wait --for=condition=Ready pod -l app=authentik-worker --timeout 20m && \
      kubectl -n authentik wait --for=condition=Ready pod -l app=authentik-postgresql --timeout 20m && \
      kubectl -n authentik wait --for=condition=Ready pod -l app=authentik-redis --timeout 20m && \
    $0 fleet && \
      kubectl -n fleet wait --for=condition=Ready pod -l app=fleet --timeout 20m && \
      kubectl -n fleet wait --for=condition=Ready pod -l app=fleet-mdm-mysql --timeout 20m && \
      kubectl -n fleet wait --for=condition=Ready pod -l app=fleet-mdm-redis --timeout 20m && \
    $0 meshcentral && \
      kubectl -n meshcentral wait --for=condition=Ready pod -l app=meshcentral --timeout 20m && \
      kubectl -n meshcentral wait --for=condition=Ready pod -l app=meshcentral-mongodb --timeout 20m && \
      kubectl -n meshcentral wait --for=condition=Ready pod -l app=meshcentral-nginx --timeout 20m && \
    $0 rmm && \
      kubectl -n tactical-rmm wait --for=condition=Ready pod -l app=tactical-backend --timeout 20m && \
      kubectl -n tactical-rmm wait --for=condition=Ready pod -l app=tactical-celery --timeout 20m && \
      kubectl -n tactical-rmm wait --for=condition=Ready pod -l app=tactical-celerybeat --timeout 20m && \
      kubectl -n tactical-rmm wait --for=condition=Ready pod -l app=tactical-frontend --timeout 20m && \
      kubectl -n tactical-rmm wait --for=condition=Ready pod -l app=tactical-nats --timeout 20m && \
      kubectl -n tactical-rmm wait --for=condition=Ready pod -l app=tactical-websockets --timeout 20m && \
    $0 register-tools
    ;;
  f|fast)
    # ------------- ALL no wait for state=Ready -------------
    $0 telepresence && \
    $0 ingress-nginx && \
    $0 grafana && \
    $0 loki && \
    $0 redis
    $0 kafka
    $0 kafka-ui
    $0 mongodb
    $0 mongodb-exporter
    $0 mongo-express
    $0 cassandra
    $0 nifi
    $0 zookeeper
    $0 pinot
    $0 config-server
    $0 api
    $0 management
    $0 stream
    $0 gateway
    $0 openframe-ui
    $0 authentik
    $0 fleet
    $0 meshcentral
    $0 rmm
    $0 register-tools
    ;;
  m|minimal)
    # ------------- ALL no wait for state=Ready -------------
    $0 telepresence && \
    $0 ingress-nginx && \
    $0 grafana && \
    $0 loki
    ;;
  infrastructure)
    # ------------- INFRASTRUCTURE -------------
    $0 telepresence && \
    $0 ingress-nginx && \
    $0 grafana && \
    $0 loki && \
    $0 redis
    $0 kafka
    $0 kafka-ui
    $0 mongodb
    $0 mongodb-exporter
    $0 mongo-express
    $0 cassandra
    $0 nifi
    $0 zookeeper
    $0 pinot
    $0 config-server
    $0 api
    $0 management
    $0 stream
    $0 gateway
    $0 openframe-ui
    ;;
  *)
      echo
      echo "Pass app name to deploy specific app to deploy application to the Kubernetes cluster"
      echo
      echo "Available options:"
      echo "  infrastructure       Deploy infrastructure applications"
      echo "      telepresence     [-] Deploy Telepresence"
      echo "      ingress-nginx    [-] Deploy Ingress Nginx"
      echo "      grafana          [-] Deploy Grafana and Prometheus stack"
      echo "      loki             [i] Deploy Loki and Promtail"
      echo "      redis            [n] Deploy Redis"
      echo "      kafka            [f] Deploy Kafka"
      echo "      kafka-ui         [r] Deploy Kafka UI"
      echo "      mongodb          [a] Deploy MongoDB"
      echo "      mongodb-exporter [s] Deploy MongoDB exporter"
      echo "      mongo-express    [t] Deploy Mongo Express"
      echo "      cassandra        [r] Deploy Cassandra"
      echo "      nifi             [u] Deploy NiFi"
      echo "      zookeeper        [c] Deploy Zookeeper"
      echo "      pinot            [t] Deploy Pinot"
      echo "      config-server    [u] Deploy Config Server"
      echo "      api              [r] Deploy API"
      echo "      management       [e] Deploy Management"
      echo "      stream           [-] Deploy Stream"
      echo "      gateway          [-] Deploy Gateway"
      echo "      openframe-ui     [-] Deploy OpenFrame UI"
      echo "  authentik            Deploy Authentik"
      echo "  fleet                Deploy Fleet"
      echo "  meshcentral          Deploy Mesh Central"
      echo "  rmm                  Deploy RMM"
      echo "  register-tools       Register tools"
      echo
      echo "  a|all                Deploy all applications"
      echo "  f|fast               Deploy all applications but don't wait for state=Ready"
      echo "  m|minimal            Deploy base applications"
      exit 1
esac
