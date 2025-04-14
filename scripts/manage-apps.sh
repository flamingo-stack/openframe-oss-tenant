#!/bin/bash

APP=$1
ACTION=$2

if [ "$APP" == "-h" ] || [ "$APP" == "--help" ] || [ "$APP" == "-Help" ]; then
  show_help_apps
  exit 0
fi

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
  for ns in "${NAMESPACES[@]}"; do
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
  platform_ingress_nginx)
    if [ "$ACTION" == "deploy" ]; then
      platform_ingress_nginx_deploy
      if [ "$IFWAIT" == "--wait" ]; then platform_ingress_nginx_wait; fi
    elif [ "$ACTION" == "dev" ]; then
      echo "$APP is not supported in dev mode"
      exit 0
    elif [ "$ACTION" == "debug" ]; then
      echo "$APP is not supported for debug mode"
    fi
    ;;
  platform_metrics_server)
    if [ "$ACTION" == "deploy" ]; then
      platform_metrics_server_deploy
      if [ "$IFWAIT" == "--wait" ]; then platform_metrics_server_wait; fi
    elif [ "$ACTION" == "dev" ]; then
      echo "$APP is not supported in dev mode"
      exit 0
    elif [ "$ACTION" == "debug" ]; then
      echo "$APP is not supported for debug mode"
    fi
    ;;
  platform_monitoring)
    if [ "$ACTION" == "deploy" ]; then
      platform_monitoring_deploy
      if [ "$IFWAIT" == "--wait" ]; then platform_monitoring_wait; fi
    elif [ "$ACTION" == "delete" ]; then
      platform_monitoring_delete
    elif [ "$ACTION" == "dev" ]; then
      echo "$APP is not supported in dev mode"
      exit 0
    elif [ "$ACTION" == "debug" ]; then
      echo "$APP is not supported for debug mode"
    fi
    ;;
  platform_logging)
    if [ "$ACTION" == "deploy" ]; then
      platform_logging_deploy
      if [ "$IFWAIT" == "--wait" ]; then platform_logging_wait; fi
    elif [ "$ACTION" == "delete" ]; then
      platform_logging_delete
    elif [ "$ACTION" == "dev" ]; then
      echo "$APP is not supported in dev mode"
      exit 0
    elif [ "$ACTION" == "debug" ]; then
      echo "$APP is not supported for debug mode"
    fi
    ;;
  platform_efk)
    if [ "$ACTION" == "deploy" ]; then
      platform_efk_deploy
      if [ "$IFWAIT" == "--wait" ]; then platform_efk_wait; fi
    elif [ "$ACTION" == "delete" ]; then
      platform_efk_delete
    elif [ "$ACTION" == "dev" ]; then
      echo "$APP is not supported in dev mode"
      exit 0
    elif [ "$ACTION" == "debug" ]; then
      echo "$APP is not supported for debug mode"
    fi
    ;;
  openframe_datasources_redis)
    if [ "$ACTION" == "deploy" ]; then
      openframe_datasources_redis_deploy
      if [ "$IFWAIT" == "--wait" ]; then openframe_datasources_redis_wait; fi
    elif [ "$ACTION" == "delete" ]; then
      openframe_datasources_redis_delete
    elif [ "$ACTION" == "dev" ]; then
      echo "$APP is not supported in dev mode"
      exit 0
    elif [ "$ACTION" == "debug" ]; then
      echo "Debug mode not enabled for this app"
    fi
    ;;
  openframe_datasources_kafka)
    if [ "$ACTION" == "deploy" ]; then
      openframe_datasources_kafka_deploy
      if [ "$IFWAIT" == "--wait" ]; then openframe_datasources_kafka_wait; fi
    elif [ "$ACTION" == "delete" ]; then
      openframe_datasources_kafka_delete
    elif [ "$ACTION" == "dev" ]; then
      echo "$APP is not supported in dev mode"
      exit 0
    elif [ "$ACTION" == "debug" ]; then
      echo "Debug mode not enabled for this app"
    fi
    ;;
  openframe_datasources_mongodb)
    if [ "$ACTION" == "deploy" ]; then
      openframe_datasources_mongodb_deploy
      if [ "$IFWAIT" == "--wait" ]; then openframe_datasources_mongodb_wait; fi
    elif [ "$ACTION" == "delete" ]; then
      openframe_datasources_mongodb_delete
    elif [ "$ACTION" == "dev" ]; then
      echo "$APP is not supported in dev mode"
      exit 0
    elif [ "$ACTION" == "debug" ]; then
      echo "Debug mode not enabled for this app"
    fi
    ;;
  openframe_datasources_mongodb_exporter)
    if [ "$ACTION" == "deploy" ]; then
      openframe_datasources_mongodb_exporter_deploy
      if [ "$IFWAIT" == "--wait" ]; then openframe_datasources_mongodb_exporter_wait; fi
    elif [ "$ACTION" == "delete" ]; then
      openframe_datasources_mongodb_exporter_delete
    elif [ "$ACTION" == "dev" ]; then
      echo "$APP is not supported in dev mode"
      exit 0
    elif [ "$ACTION" == "debug" ]; then
      echo "$APP is not supported for debug mode"
    fi
    ;;
  openframe_datasources_cassandra)
    if [ "$ACTION" == "deploy" ]; then
      openframe_datasources_cassandra_deploy
      if [ "$IFWAIT" == "--wait" ]; then openframe_datasources_cassandra_wait; fi
    elif [ "$ACTION" == "delete" ]; then
      openframe_datasources_cassandra_delete
    elif [ "$ACTION" == "dev" ]; then
      echo "$APP is not supported in dev mode"
      exit 0
    elif [ "$ACTION" == "debug" ]; then
      echo "Debug mode not enabled for this app"
    fi
    ;;
  openframe_datasources_nifi)
    if [ "$ACTION" == "deploy" ]; then
      openframe_datasources_nifi_deploy
      if [ "$IFWAIT" == "--wait" ]; then openframe_datasources_nifi_wait; fi
    elif [ "$ACTION" == "delete" ]; then
      openframe_datasources_nifi_delete
    elif [ "$ACTION" == "dev" ]; then
      echo "Deploying NiFi in dev mode"
      cd ${SCRIPT_DIR}/infrastructure/nifi
      skaffold dev --no-prune=false --cache-artifacts=false -n infrastructure
    elif [ "$ACTION" == "debug" ]; then
      echo "Debug mode not enabled for this app"
    fi
    ;;
  openframe_datasources_zookeeper)
    if [ "$ACTION" == "deploy" ]; then
      openframe_datasources_zookeeper_deploy
      if [ "$IFWAIT" == "--wait" ]; then openframe_datasources_zookeeper_wait; fi
    elif [ "$ACTION" == "delete" ]; then
      openframe_datasources_zookeeper_delete
    elif [ "$ACTION" == "dev" ]; then
      echo "$APP is not supported in dev mode"
      exit 0
    elif [ "$ACTION" == "debug" ]; then
      echo "Debug mode not enabled for this app"
    fi
    ;;
  openframe_datasources_pinot)
    if [ "$ACTION" == "deploy" ]; then
      openframe_datasources_pinot_deploy
      if [ "$IFWAIT" == "--wait" ]; then openframe_datasources_pinot_wait; fi
    elif [ "$ACTION" == "delete" ]; then
      openframe_datasources_pinot_delete
    elif [ "$ACTION" == "dev" ]; then
      echo "$APP is not supported in dev mode"
      exit 0
    elif [ "$ACTION" == "debug" ]; then
      echo "Debug mode not enabled for this app"
    fi
    ;;
  openframe_microservices_openframe_config_server)
    if [ "$ACTION" == "deploy" ]; then
      openframe_microservices_openframe_config_server_deploy
      if [ "$IFWAIT" == "--wait" ]; then openframe_microservices_openframe_config_server_wait; fi
    elif [ "$ACTION" == "delete" ]; then
      openframe_microservices_openframe_config_server_delete
    elif [ "$ACTION" == "dev" ]; then
      echo "Deploying Config Server in dev mode"
      cd ${ROOT_REPO_DIR}/openframe/services/openframe-config
      skaffold dev --no-prune=false --cache-artifacts=false -n openframe-microservices
    elif [ "$ACTION" == "debug" ]; then
      echo "Debug mode not enabled for this app"
    fi
    ;;
  openframe_microservices_openframe_api)
    if [ "$ACTION" == "deploy" ]; then
      openframe_microservices_openframe_api_deploy
      if [ "$IFWAIT" == "--wait" ]; then openframe_microservices_openframe_api_wait; fi
    elif [ "$ACTION" == "delete" ]; then
      openframe_microservices_openframe_api_delete
    elif [ "$ACTION" == "dev" ]; then
      echo "Deploying API in dev mode"
      cd ${ROOT_REPO_DIR}/openframe/services/openframe-api
      skaffold dev --no-prune=false --cache-artifacts=false -n openframe-microservices
    elif [ "$ACTION" == "debug" ]; then
      debug_app "openframe-api" "openframe-api" "openframe-microservices" "$LOCAL_PORT" "$REMOTE_PORT_NAME"
    fi
    ;;
  openframe_microservices_openframe_management)
    if [ "$ACTION" == "deploy" ]; then
      openframe_microservices_openframe_management_deploy
      if [ "$IFWAIT" == "--wait" ]; then openframe_microservices_openframe_management_wait; fi
    elif [ "$ACTION" == "delete" ]; then
      openframe_microservices_openframe_management_delete
    elif [ "$ACTION" == "dev" ]; then
      echo "Deploying Management in dev mode"
      cd ${ROOT_REPO_DIR}/openframe/services/openframe-management
      skaffold dev --no-prune=false --cache-artifacts=false -n openframe-microservices
    elif [ "$ACTION" == "debug" ]; then
      echo "Debug mode not enabled for this app"
    fi
    ;;
  openframe_microservices_openframe_stream)
    if [ "$ACTION" == "deploy" ]; then
      openframe_microservices_openframe_stream_deploy
      if [ "$IFWAIT" == "--wait" ]; then openframe_microservices_openframe_stream_wait; fi
    elif [ "$ACTION" == "delete" ]; then
      openframe_microservices_openframe_stream_delete
    elif [ "$ACTION" == "dev" ]; then
      echo "Deploying Stream in dev mode"
      cd ${ROOT_REPO_DIR}/openframe/services/openframe-stream
      skaffold dev --no-prune=false --cache-artifacts=false -n openframe-microservices
    elif [ "$ACTION" == "debug" ]; then
      echo "Debug mode not enabled for this app"
    fi
    ;;
  openframe_microservices_openframe_gateway)
    if [ "$ACTION" == "deploy" ]; then
      openframe_microservices_openframe_gateway_deploy
      if [ "$IFWAIT" == "--wait" ]; then openframe_microservices_openframe_gateway_wait; fi
    elif [ "$ACTION" == "delete" ]; then
      openframe_microservices_openframe_gateway_delete
    elif [ "$ACTION" == "dev" ]; then
      echo "Deploying Gateway in dev mode"
      cd ${ROOT_REPO_DIR}/openframe/services/openframe-gateway
      skaffold dev --no-prune=false --cache-artifacts=false -n openframe-microservices
    elif [ "$ACTION" == "debug" ]; then
      echo "Debug mode not enabled for this app"
    fi
    ;;
  openframe_microservices_openframe_ui)
    if [ "$ACTION" == "deploy" ]; then
      openframe_microservices_openframe_ui_deploy
      if [ "$IFWAIT" == "--wait" ]; then openframe_microservices_openframe_ui_wait; fi
    elif [ "$ACTION" == "delete" ]; then
      openframe_microservices_openframe_ui_delete
    elif [ "$ACTION" == "dev" ]; then
      echo "Deploying OpenFrame UI in dev mode"
      cd ${ROOT_REPO_DIR}/openframe/services/openframe-ui
      skaffold dev --no-prune=false --cache-artifacts=false -n openframe-microservices
    elif [ "$ACTION" == "debug" ]; then
      echo "Debug mode not enabled for this app"
    fi
    ;;
  openframe_microservices_register_apps)
    # kubectl -n infrastructure apply -f ./kind-cluster/apps/jobs/register-tools.yaml && \
    # kubectl -n infrastructure wait --for=condition=Ready pod -l app=register-tools --timeout 20m
    ${ROOT_REPO_DIR}/kind-cluster/apps/openframe-microservices/register/register.sh
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
      cd ${ROOT_REPO_DIR}/integrated-tools/fleetmdm
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
      cd ${ROOT_REPO_DIR}/integrated-tools/meshcentral/server
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
  observability)
    ACTION=${2}
    IFWAIT=${3:-}

    $0 monitoring $ACTION $IFWAIT && \
    $0 logging $ACTION $IFWAIT
    ;;
  m|minimal)
    ACTION=${2}
    IFWAIT=${3:-}

    $0 platform_ingress_nginx $ACTION $IFWAIT && \
    $0 platform_metrics_server $ACTION $IFWAIT && \
    $0 observability $ACTION $IFWAIT && \
    platform_wait_all
    ;;
  client_tools)
    ACTION=${2}
    IFWAIT=${3:-}

    $0 kafka-ui $ACTION $IFWAIT && \
    $0 mongo-express $ACTION $IFWAIT && \
    $0 telepresence $ACTION $IFWAIT
    ;;
  openframe_datasources)
    ACTION=${2}
    IFWAIT=${3:-}

    $0 openframe_datasources_redis $ACTION $IFWAIT
    $0 openframe_datasources_kafka $ACTION $IFWAIT
    $0 openframe_datasources_mongodb $ACTION $IFWAIT
    $0 openframe_datasources_mongodb_exporter $ACTION $IFWAIT
    $0 openframe_datasources_cassandra $ACTION $IFWAIT
    $0 openframe_datasources_nifi $ACTION $IFWAIT
    $0 openframe_datasources_zookeeper $ACTION $IFWAIT
    $0 openframe_datasources_pinot $ACTION $IFWAIT
    openframe_datasources_wait_all
    ;;
  openframe_microservices)
    ACTION=${2}
    IFWAIT=${3:-}

    $0 openframe_microservices_openframe_config_server $ACTION $IFWAIT && \
    $0 openframe_microservices_openframe_api $ACTION $IFWAIT && \
    $0 openframe_microservices_openframe_management $ACTION $IFWAIT && \
    $0 openframe_microservices_openframe_stream $ACTION $IFWAIT && \
    $0 openframe_microservices_openframe_gateway $ACTION $IFWAIT && \
    $0 openframe_microservices_openframe_ui $ACTION $IFWAIT && \
    openframe_microservices_wait_all
    $0 openframe_microservices_register_apps $ACTION
    ;;
  a|all)
    # ------------- ALL -------------
    ACTION=${2}
    IFWAIT=${3:-}

    $0 platform $ACTION $IFWAIT && \
    $0 openframe_datasources $ACTION $IFWAIT && \
    $0 openframe_microservices $ACTION $IFWAIT && \
    $0 openframe_microservices_register_apps $ACTION && \
    $0 authentik $ACTION $IFWAIT && \
    $0 fleet $ACTION $IFWAIT && \
    $0 meshcentral $ACTION $IFWAIT && \
    $0 rmm $ACTION $IFWAIT && \
    $0 client_tools $ACTION $IFWAIT
    ;;
  -h|--help|-Help)
    show_help_apps
    ;;
  *)
    echo "Unknown app: $APP"
    show_help_apps
    exit 1
esac
