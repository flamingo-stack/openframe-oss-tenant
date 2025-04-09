#!/bin/bash

APP=$1
ACTION=$2

if [ "$ACTION" == "debug" ]; then
  LOCAL_PORT="$4"
  REMOTE_PORT_NAME="$5"
elif [ "$ACTION" == "deploy" ]; then
  IFWAIT=$3
fi

if [ -z "$APP" ]; then
  show_help_apps
  exit 0
fi

if [ "$ACTION" == "" ]; then
  echo "Action is required"
  exit 0
fi

# Function to check if namespaces and secrets already exist
function check_bases() {
  local namespaces=(infrastructure authentik fleet meshcentral tactical-rmm)
  for ns in "${namespaces[@]}"; do
    if ! kubectl get namespace "$ns" &> /dev/null; then
      return 1
    fi
    if ! kubectl -n "$ns" get secret github-pat-secret &> /dev/null; then
      return 1
    fi
  done
  return 0
}

# Check and run bases.sh only if necessary
if ! check_bases; then
  bash ./scripts/functions/bases.sh
fi

case "$APP" in
  telepresence)
    if [ "$ACTION" == "deploy" ]; then
      tools_telepresence_deploy
      if [ "$IFWAIT" == "--wait" ]; then tools_telepresence_wait; fi
    elif [ "$ACTION" == "delete" ]; then
      tools_telepresence_delete
    elif [ "$ACTION" == "dev" ]; then
      echo "$APP is not supported in dev mode"
      exit 0
    elif [ "$ACTION" == "debug" ]; then
      echo "$APP is not supported for debug mode"
    fi
    ;;
  ingress-nginx)
    if [ "$ACTION" == "deploy" ]; then
      cluster_ingress_nginx_deploy
      if [ "$IFWAIT" == "--wait" ]; then cluster_ingress_nginx_wait; fi
    elif [ "$ACTION" == "dev" ]; then
      echo "$APP is not supported in dev mode"
      exit 0
    elif [ "$ACTION" == "debug" ]; then
      echo "$APP is not supported for debug mode"
    fi
    ;;
  metrics-server)
    if [ "$ACTION" == "deploy" ]; then
      cluster_metrics_server_deploy
      if [ "$IFWAIT" == "--wait" ]; then cluster_metrics_server_wait; fi
    elif [ "$ACTION" == "dev" ]; then
      echo "$APP is not supported in dev mode"
      exit 0
    elif [ "$ACTION" == "debug" ]; then
      echo "$APP is not supported for debug mode"
    fi
    ;;
  monitoring)
    if [ "$ACTION" == "deploy" ]; then
      cluster_monitoring_deploy
      if [ "$IFWAIT" == "--wait" ]; then cluster_monitoring_wait; fi
    elif [ "$ACTION" == "delete" ]; then
      cluster_monitoring_delete
    elif [ "$ACTION" == "dev" ]; then
      echo "$APP is not supported in dev mode"
      exit 0
    elif [ "$ACTION" == "debug" ]; then
      echo "$APP is not supported for debug mode"
    fi
    ;;
  logging)
    if [ "$ACTION" == "deploy" ]; then
      cluster_logging_deploy
      if [ "$IFWAIT" == "--wait" ]; then cluster_logging_wait; fi
    elif [ "$ACTION" == "delete" ]; then
      cluster_logging_delete
    elif [ "$ACTION" == "dev" ]; then
      echo "$APP is not supported in dev mode"
      exit 0
    elif [ "$ACTION" == "debug" ]; then
      echo "$APP is not supported for debug mode"
    fi
    ;;
  efk)
    if [ "$ACTION" == "deploy" ]; then
      cluster_efk_deploy
      if [ "$IFWAIT" == "--wait" ]; then cluster_efk_wait; fi
    elif [ "$ACTION" == "delete" ]; then
      cluster_efk_delete
    elif [ "$ACTION" == "dev" ]; then
      echo "$APP is not supported in dev mode"
      exit 0
    elif [ "$ACTION" == "debug" ]; then
      echo "$APP is not supported for debug mode"
    fi
    ;;
  redis)
    if [ "$ACTION" == "deploy" ]; then
      infra_redis_deploy
      if [ "$IFWAIT" == "--wait" ]; then infra_redis_wait; fi
    elif [ "$ACTION" == "delete" ]; then
      infra_redis_delete
    elif [ "$ACTION" == "dev" ]; then
      echo "$APP is not supported in dev mode"
      exit 0
    elif [ "$ACTION" == "debug" ]; then
      echo "Debug mode not enabled for this app"
    fi
    ;;
  kafka)
    if [ "$ACTION" == "deploy" ]; then
      infra_kafka_deploy
      if [ "$IFWAIT" == "--wait" ]; then infra_kafka_wait; fi
    elif [ "$ACTION" == "delete" ]; then
      infra_kafka_delete
    elif [ "$ACTION" == "dev" ]; then
      echo "$APP is not supported in dev mode"
      exit 0
    elif [ "$ACTION" == "debug" ]; then
      echo "Debug mode not enabled for this app"
    fi
    ;;
  kafka-ui)
    if [ "$ACTION" == "deploy" ]; then
      tools_kafka_ui_deploy
      if [ "$IFWAIT" == "--wait" ]; then tools_kafka_ui_wait; fi
    elif [ "$ACTION" == "delete" ]; then
      tools_kafka_ui_delete
    elif [ "$ACTION" == "dev" ]; then
      echo "$APP is not supported in dev mode"
      exit 0
    elif [ "$ACTION" == "debug" ]; then
      echo "$APP is not supported for debug mode"
    fi
    ;;
  mongodb)
    if [ "$ACTION" == "deploy" ]; then
      infra_mongodb_deploy
      if [ "$IFWAIT" == "--wait" ]; then infra_mongodb_wait; fi
    elif [ "$ACTION" == "delete" ]; then
      infra_mongodb_delete
    elif [ "$ACTION" == "dev" ]; then
      echo "$APP is not supported in dev mode"
      exit 0
    elif [ "$ACTION" == "debug" ]; then
      echo "Debug mode not enabled for this app"
    fi
    ;;
  mongodb-exporter)
    if [ "$ACTION" == "deploy" ]; then
      infra_mongodb_exporter_deploy
      if [ "$IFWAIT" == "--wait" ]; then infra_mongodb_exporter_wait; fi
    elif [ "$ACTION" == "delete" ]; then
      infra_mongodb_exporter_delete
    elif [ "$ACTION" == "dev" ]; then
      echo "$APP is not supported in dev mode"
      exit 0
    elif [ "$ACTION" == "debug" ]; then
      echo "$APP is not supported for debug mode"
    fi
    ;;
  mongo-express)
    if [ "$ACTION" == "deploy" ]; then
      tools_mongo_express_deploy
      if [ "$IFWAIT" == "--wait" ]; then tools_mongo_express_wait; fi
    elif [ "$ACTION" == "delete" ]; then
      tools_mongo_express_delete
    elif [ "$ACTION" == "dev" ]; then
      echo "$APP is not supported in dev mode"
      exit 0
    elif [ "$ACTION" == "debug" ]; then
      echo "$APP is not supported for debug mode"
    fi
    ;;
  cassandra)
    if [ "$ACTION" == "deploy" ]; then
      infra_cassandra_deploy
      if [ "$IFWAIT" == "--wait" ]; then infra_cassandra_wait; fi
    elif [ "$ACTION" == "delete" ]; then
      infra_cassandra_delete
    elif [ "$ACTION" == "dev" ]; then
      echo "$APP is not supported in dev mode"
      exit 0
    elif [ "$ACTION" == "debug" ]; then
      echo "Debug mode not enabled for this app"
    fi
    ;;
  nifi)
    if [ "$ACTION" == "deploy" ]; then
      infra_nifi_deploy
      if [ "$IFWAIT" == "--wait" ]; then infra_nifi_wait; fi
    elif [ "$ACTION" == "delete" ]; then
      infra_nifi_delete
    elif [ "$ACTION" == "dev" ]; then
      echo "Deploying NiFi in dev mode"
      cd ./infrastructure/nifi
      skaffold dev --no-prune=false --cache-artifacts=false -n infrastructure
    elif [ "$ACTION" == "debug" ]; then
      echo "Debug mode not enabled for this app"
    fi
    ;;
  zookeeper)
    if [ "$ACTION" == "deploy" ]; then
      infra_zookeeper_deploy
      if [ "$IFWAIT" == "--wait" ]; then infra_zookeeper_wait; fi
    elif [ "$ACTION" == "delete" ]; then
      infra_zookeeper_delete
    elif [ "$ACTION" == "dev" ]; then
      echo "$APP is not supported in dev mode"
      exit 0
    elif [ "$ACTION" == "debug" ]; then
      echo "Debug mode not enabled for this app"
    fi
    ;;
  pinot)
    if [ "$ACTION" == "deploy" ]; then
      infra_pinot_deploy
      if [ "$IFWAIT" == "--wait" ]; then infra_pinot_wait; fi
    elif [ "$ACTION" == "delete" ]; then
      infra_pinot_delete
    elif [ "$ACTION" == "dev" ]; then
      echo "$APP is not supported in dev mode"
      exit 0
    elif [ "$ACTION" == "debug" ]; then
      echo "Debug mode not enabled for this app"
    fi
    ;;
  openframe-config-server)
    if [ "$ACTION" == "deploy" ]; then
      infra_config_server_deploy
      if [ "$IFWAIT" == "--wait" ]; then infra_config_server_wait; fi
    elif [ "$ACTION" == "delete" ]; then
      infra_config_server_delete
    elif [ "$ACTION" == "dev" ]; then
      echo "Deploying Config Server in dev mode"
      cd ./services/openframe-config
      skaffold dev --no-prune=false --cache-artifacts=false -n infrastructure
    elif [ "$ACTION" == "debug" ]; then
      echo "Debug mode not enabled for this app"
    fi
    ;;
  openframe-api)
    if [ "$ACTION" == "deploy" ]; then
      infra_api_deploy
      if [ "$IFWAIT" == "--wait" ]; then infra_api_wait; fi
    elif [ "$ACTION" == "delete" ]; then
      infra_api_delete
    elif [ "$ACTION" == "dev" ]; then
      echo "Deploying API in dev mode"
      cd ./services/openframe-api
      skaffold dev --no-prune=false --cache-artifacts=false -n infrastructure
    elif [ "$ACTION" == "debug" ]; then
      debug_app "openframe-api" "openframe-api" "infrastructure" "$LOCAL_PORT" "$REMOTE_PORT_NAME"
    fi
    ;;
  openframe-management)
    if [ "$ACTION" == "deploy" ]; then
      infra_management_deploy
      if [ "$IFWAIT" == "--wait" ]; then infra_management_wait; fi
    elif [ "$ACTION" == "delete" ]; then
      infra_management_delete
    elif [ "$ACTION" == "dev" ]; then
      echo "Deploying Management in dev mode"
      cd ./services/openframe-management
      skaffold dev --no-prune=false --cache-artifacts=false -n infrastructure
    elif [ "$ACTION" == "debug" ]; then
      echo "Debug mode not enabled for this app"
    fi
    ;;
  openframe-stream)
    if [ "$ACTION" == "deploy" ]; then
      infra_stream_deploy
      if [ "$IFWAIT" == "--wait" ]; then infra_stream_wait; fi
    elif [ "$ACTION" == "delete" ]; then
      infra_stream_delete
    elif [ "$ACTION" == "dev" ]; then
      echo "Deploying Stream in dev mode"
      cd ./services/openframe-stream
      skaffold dev --no-prune=false --cache-artifacts=false -n infrastructure
    elif [ "$ACTION" == "debug" ]; then
      echo "Debug mode not enabled for this app"
    fi
    ;;
  openframe-gateway)
    if [ "$ACTION" == "deploy" ]; then
      infra_gateway_deploy
      if [ "$IFWAIT" == "--wait" ]; then infra_gateway_wait; fi
    elif [ "$ACTION" == "delete" ]; then
      infra_gateway_delete
    elif [ "$ACTION" == "dev" ]; then
      echo "Deploying Gateway in dev mode"
      cd ./services/openframe-gateway
      skaffold dev --no-prune=false --cache-artifacts=false -n infrastructure
    elif [ "$ACTION" == "debug" ]; then
      echo "Debug mode not enabled for this app"
    fi
    ;;
  openframe-ui)
    if [ "$ACTION" == "deploy" ]; then
      infra_openframe_ui_deploy
      if [ "$IFWAIT" == "--wait" ]; then infra_openframe_ui_wait; fi
    elif [ "$ACTION" == "delete" ]; then
      infra_openframe_ui_delete
    elif [ "$ACTION" == "dev" ]; then
      echo "Deploying OpenFrame UI in dev mode"
      cd ./services/openframe-ui
      skaffold dev --no-prune=false --cache-artifacts=false -n infrastructure
    elif [ "$ACTION" == "debug" ]; then
      echo "Debug mode not enabled for this app"
    fi
    ;;
  authentik)
    if [ "$ACTION" == "deploy" ]; then
      authentik_deploy
      if [ "$IFWAIT" == "--wait" ]; then authentik_wait; fi
    elif [ "$ACTION" == "delete" ]; then
      authentik_delete
    elif [ "$ACTION" == "dev" ]; then
      echo "$APP is not supported in dev mode"
      exit 0
    elif [ "$ACTION" == "debug" ]; then
      echo "Debug mode not enabled for this app"
    fi
    ;;
  fleet)
    if [ "$ACTION" == "deploy" ]; then
      fleet_deploy
      if [ "$IFWAIT" == "--wait" ]; then fleet_wait; fi
    elif [ "$ACTION" == "delete" ]; then
      fleet_delete
    elif [ "$ACTION" == "dev" ]; then
      echo "Deploying Fleet in dev mode"
      cd ./infrastructure/fleetmdm
      skaffold dev --no-prune=false --cache-artifacts=false -n fleet
    elif [ "$ACTION" == "debug" ]; then
      echo "Debug mode not enabled for this app"
    fi
    ;;
  meshcentral)
    if [ "$ACTION" == "deploy" ]; then
      meshcentral_deploy
      if [ "$IFWAIT" == "--wait" ]; then meshcentral_wait; fi
    elif [ "$ACTION" == "delete" ]; then
      meshcentral_delete
    elif [ "$ACTION" == "dev" ]; then
      echo "Deploying MeshCentral in dev mode"
      cd ./infrastructure/meshcentral/server
      skaffold dev --no-prune=false --cache-artifacts=false -n meshcentral
    elif [ "$ACTION" == "debug" ]; then
      echo "Debug mode not enabled for this app"
    fi
    ;;
  rmm)
    if [ "$ACTION" == "deploy" ]; then
      tactical_rmm_deploy
      if [ "$IFWAIT" == "--wait" ]; then tactical_rmm_wait; fi
    elif [ "$ACTION" == "delete" ]; then
      tactical_rmm_delete
    elif [ "$ACTION" == "dev" ]; then
      echo "$APP is not supported in dev mode"
      exit 0
    elif [ "$ACTION" == "debug" ]; then
      echo "Debug mode not enabled for this app"
    fi
    ;;
  register-apps)
    # kubectl -n infrastructure apply -f ./kind-cluster/apps/jobs/register-tools.yaml && \
    # kubectl -n infrastructure wait --for=condition=Ready pod -l app=register-tools --timeout 20m
    ./kind-cluster/apps/jobs/register.sh
    ;;
  observability)
    ACTION=${2}
    IFWAIT=${3:-}

    $0 monitoring $ACTION $IFWAIT && \
    $0 logging $ACTION $IFWAIT
    ;;
  m|minimal)
    ACTION=${2}
    IFWAIT=${3:-}

    $0 ingress-nginx $ACTION $IFWAIT && \
    $0 metrics-server $ACTION $IFWAIT && \
    $0 observability $ACTION $IFWAIT
    ;;
  tools)
    ACTION=${2}
    IFWAIT=${3:-}

    $0 telepresence $ACTION $IFWAIT && \
    $0 mongo-express $ACTION $IFWAIT && \
    $0 kafka-ui $ACTION $IFWAIT
    ;;
  infrastructure)
    ACTION=${2}
    IFWAIT=${3:-}

    $0 minimal $ACTION $IFWAIT && \
    $0 redis $ACTION $IFWAIT && \
    $0 kafka $ACTION $IFWAIT && \
    $0 mongodb $ACTION $IFWAIT && \
    $0 mongodb-exporter $ACTION $IFWAIT && \
    $0 cassandra $ACTION $IFWAIT && \
    $0 nifi $ACTION $IFWAIT && \
    $0 zookeeper $ACTION $IFWAIT && \
    $0 pinot $ACTION $IFWAIT && \
    $0 openframe-config-server $ACTION $IFWAIT && \
    $0 openframe-api $ACTION $IFWAIT && \
    $0 openframe-management $ACTION $IFWAIT && \
    $0 openframe-stream $ACTION $IFWAIT && \
    $0 openframe-gateway $ACTION $IFWAIT && \
    $0 openframe-ui $ACTION $IFWAIT && \
    $0 tools $ACTION $IFWAIT
    ;;
  a|all)
    # ------------- ALL -------------
    ACTION=${2}
    IFWAIT=${3:-}

    $0 minimal $ACTION $IFWAIT && \
    $0 redis $ACTION $IFWAIT && \
    $0 kafka $ACTION $IFWAIT && \
    $0 mongodb $ACTION $IFWAIT && \
    $0 mongodb-exporter $ACTION $IFWAIT && \
    $0 cassandra $ACTION $IFWAIT && \
    $0 nifi $ACTION $IFWAIT && \
    $0 zookeeper $ACTION $IFWAIT && \
    $0 pinot $ACTION $IFWAIT && \
    $0 openframe-config-server $ACTION $IFWAIT && \
    $0 openframe-api $ACTION $IFWAIT && \
    $0 openframe-management $ACTION $IFWAIT && \
    $0 openframe-stream $ACTION $IFWAIT && \
    $0 openframe-gateway $ACTION $IFWAIT && \
    $0 openframe-ui $ACTION $IFWAIT && \
    $0 authentik $ACTION $IFWAIT && \
    $0 fleet $ACTION $IFWAIT && \
    $0 meshcentral $ACTION $IFWAIT && \
    $0 rmm $ACTION $IFWAIT && \
    $0 tools $ACTION $IFWAIT && \
    $0 register-apps $ACTION
    ;;
  -h|--help|-Help)
    show_help_apps
    ;;
  *)
    echo "Unknown app: $APP"
    show_help_apps
    exit 1
esac
