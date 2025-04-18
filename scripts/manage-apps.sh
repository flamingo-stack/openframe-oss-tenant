#!/bin/bash

APP=$1
ACTION=$2

if [ "$ACTION" == "debug" ]; then
  LOCAL_PORT="$4"
  REMOTE_PORT_NAME="$5"
fi

if [ "$APP" != "''" ] && [ "$ACTION" == "" ]; then
  echo "Action is required: deploy, delete, dev, debug"
  exit 1
fi

case "$APP" in
  platform_ingress_nginx)
    if [ "$ACTION" == "deploy" ]; then
      platform_ingress_nginx_deploy && platform_ingress_nginx_wait
    elif [ "$ACTION" == "delete" ]; then
      platform_ingress_nginx_delete
    elif [ "$ACTION" == "dev" ]; then
      echo "$APP is not supported in dev mode"
      exit 0
    elif [ "$ACTION" == "debug" ]; then
      echo "$APP is not supported for debug mode"
    fi
    ;;
  platform_monitoring)
    if [ "$ACTION" == "deploy" ]; then
      platform_monitoring_deploy && platform_monitoring_wait
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
      platform_logging_deploy && platform_logging_wait
    elif [ "$ACTION" == "delete" ]; then
      platform_logging_delete
    elif [ "$ACTION" == "dev" ]; then
      echo "$APP is not supported in dev mode"
      exit 0
    elif [ "$ACTION" == "debug" ]; then
      echo "$APP is not supported for debug mode"
    fi
    ;;
  # platform_metrics_server)
  #   if [ "$ACTION" == "deploy" ]; then
  #     platform_metrics_server_deploy
  #   elif [ "$ACTION" == "delete" ]; then
  #     platform_metrics_server_delete
  #   elif [ "$ACTION" == "dev" ]; then
  #     echo "$APP is not supported in dev mode"
  #     exit 0
  #   elif [ "$ACTION" == "debug" ]; then
  #     echo "$APP is not supported for debug mode"
  #   fi
  #   ;;
  platform_efk)
    if [ "$ACTION" == "deploy" ]; then
      platform_efk_deploy
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
    elif [ "$ACTION" == "delete" ]; then
      openframe_microservices_openframe_config_server_delete
    elif [ "$ACTION" == "dev" ]; then
      echo "Deploying Config Server in dev mode"
      cd ${ROOT_REPO_DIR}/openframe/services/openframe-config
      skaffold dev --no-prune=false --cache-artifacts=false -n openframe-microservices
    elif [ "$ACTION" == "debug" ]; then
      debug_app "openframe-config-server" "openframe-config-server" "openframe-microservices" "$LOCAL_PORT" "$REMOTE_PORT_NAME"
    fi
    ;;
  openframe_microservices_openframe_api)
    if [ "$ACTION" == "deploy" ]; then
      openframe_microservices_openframe_api_deploy
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
    elif [ "$ACTION" == "delete" ]; then
      openframe_microservices_openframe_gateway_delete
    elif [ "$ACTION" == "dev" ]; then
      echo "Deploying Gateway in dev mode"
      cd ${ROOT_REPO_DIR}/openframe/services/openframe-gateway
      skaffold dev --no-prune=false --cache-artifacts=false -n openframe-microservices
    elif [ "$ACTION" == "debug" ]; then
      debug_app "openframe-gateway" "openframe-gateway" "openframe-microservices" "$LOCAL_PORT" "$REMOTE_PORT_NAME"
    fi
    ;;
  openframe_microservices_openframe_ui)
    if [ "$ACTION" == "deploy" ]; then
      openframe_microservices_openframe_ui_deploy
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
    openframe_microservices_openframe_management_wait && ${ROOT_REPO_DIR}/kind-cluster/apps/openframe-microservices/register/register.sh
    ;;
  integrated_tools_datasources_fleet)
    if [ "$ACTION" == "deploy" ]; then
      integrated_tools_datasources_fleet_deploy
    elif [ "$ACTION" == "delete" ]; then
      integrated_tools_datasources_fleet_delete
    elif [ "$ACTION" == "dev" ]; then
      echo "Deploying Fleet in dev mode"
      cd ${ROOT_REPO_DIR}/integrated-tools/fleetmdm
      skaffold dev --no-prune=false --cache-artifacts=false -n fleet
    elif [ "$ACTION" == "debug" ]; then
      echo "Debug mode not enabled for this app"
    fi
    ;;
  integrated_tools_fleet)
    if [ "$ACTION" == "deploy" ]; then
      integrated_tools_datasources_fleet_wait && integrated_tools_fleet_deploy
    elif [ "$ACTION" == "delete" ]; then
      integrated_tools_fleet_delete
    elif [ "$ACTION" == "dev" ]; then
      echo "Deploying Fleet in dev mode"
      cd ${ROOT_REPO_DIR}/integrated-tools/fleetmdm
      skaffold dev --no-prune=false --cache-artifacts=false -n fleet
    elif [ "$ACTION" == "debug" ]; then
      echo "Debug mode not enabled for this app"
    fi
    ;;
  integrated_tools_datasources_authentik)
    if [ "$ACTION" == "deploy" ]; then
      integrated_tools_datasources_authentik_deploy
    elif [ "$ACTION" == "delete" ]; then
      integrated_tools_datasources_authentik_delete
    elif [ "$ACTION" == "dev" ]; then
      echo "$APP is not supported in dev mode"
      exit 0
    elif [ "$ACTION" == "debug" ]; then
      echo "Debug mode not enabled for this app"
    fi
    ;;
  integrated_tools_authentik)
    if [ "$ACTION" == "deploy" ]; then
      integrated_tools_datasources_authentik_wait && integrated_tools_authentik_deploy
    elif [ "$ACTION" == "delete" ]; then
      integrated_tools_authentik_delete
    elif [ "$ACTION" == "dev" ]; then
      echo "$APP is not supported in dev mode"
      exit 0
    elif [ "$ACTION" == "debug" ]; then
      echo "Debug mode not enabled for this app"
    fi
    ;;
  integrated_tools_datasources_meshcentral)
    if [ "$ACTION" == "deploy" ]; then
      integrated_tools_datasources_meshcentral_deploy
    elif [ "$ACTION" == "delete" ]; then
      integrated_tools_datasources_meshcentral_delete
    elif [ "$ACTION" == "dev" ]; then
      echo "$APP is not supported in dev mode"
      exit 0
    elif [ "$ACTION" == "debug" ]; then
      echo "Debug mode not enabled for this app"
    fi
    ;;
  integrated_tools_meshcentral)
    if [ "$ACTION" == "deploy" ]; then
      integrated_tools_datasources_meshcentral_wait && integrated_tools_meshcentral_deploy
    elif [ "$ACTION" == "delete" ]; then
      integrated_tools_meshcentral_delete
    elif [ "$ACTION" == "dev" ]; then
      echo "Deploying MeshCentral in dev mode"
      cd ${ROOT_REPO_DIR}/integrated-tools/meshcentral/server
      skaffold dev --no-prune=false --cache-artifacts=false -n integrated-tools
    elif [ "$ACTION" == "debug" ]; then
      echo "Debug mode not enabled for this app"
    fi
    ;;
  integrated_tools_datasources_tactical_rmm)
    if [ "$ACTION" == "deploy" ]; then
      integrated_tools_datasources_tactical_rmm_deploy
    elif [ "$ACTION" == "delete" ]; then
      integrated_tools_datasources_tactical_rmm_delete
    elif [ "$ACTION" == "dev" ]; then
      echo "$APP is not supported in dev mode"
      exit 0
    elif [ "$ACTION" == "debug" ]; then
      echo "Debug mode not enabled for this app"
    fi
    ;;
  integrated_tools_tactical_rmm)
    if [ "$ACTION" == "deploy" ]; then
      integrated_tools_datasources_tactical_rmm_wait && integrated_tools_tactical_rmm_deploy
    elif [ "$ACTION" == "delete" ]; then
      integrated_tools_tactical_rmm_delete
    elif [ "$ACTION" == "dev" ]; then
      echo "$APP is not supported in dev mode"
      exit 0
    elif [ "$ACTION" == "debug" ]; then
      echo "Debug mode not enabled for this app"
    fi
    ;;
  tools_kafka_ui)
    if [ "$ACTION" == "deploy" ]; then
      openframe_datasources_kafka_wait && tools_kafka_ui_deploy
    elif [ "$ACTION" == "delete" ]; then
      tools_kafka_ui_delete
    elif [ "$ACTION" == "dev" ]; then
      echo "$APP is not supported in dev mode"
      exit 0
    elif [ "$ACTION" == "debug" ]; then
      echo "$APP is not supported for debug mode"
    fi
    ;;
  tools_mongo_express)
    if [ "$ACTION" == "deploy" ]; then
      openframe_datasources_mongodb_wait && tools_mongo_express_deploy
    elif [ "$ACTION" == "delete" ]; then
      tools_mongo_express_delete
    elif [ "$ACTION" == "dev" ]; then
      echo "$APP is not supported in dev mode"
      exit 0
    elif [ "$ACTION" == "debug" ]; then
      echo "$APP is not supported for debug mode"
    fi
    ;;
  tools_telepresence)
    if [ "$ACTION" == "deploy" ]; then
      tools_telepresence_deploy
    elif [ "$ACTION" == "delete" ]; then
      tools_telepresence_delete
    elif [ "$ACTION" == "dev" ]; then
      echo "$APP is not supported in dev mode"
      exit 0
    elif [ "$ACTION" == "debug" ]; then
      echo "$APP is not supported for debug mode"
    fi
    ;;
  # BUNDLE APPS
  o|observability)
    ACTION=${2}
    IFWAIT=${3:-}

    $0 platform_monitoring $ACTION && \
    $0 platform_logging $ACTION &&
    # $0 platform_metrics_server $ACTION
    echo
    ;;
  p|platform)
    ACTION=${2}
    IFWAIT=${3:-}

    $0 platform_ingress_nginx $ACTION && \
    $0 observability $ACTION
    ;;
  t|client_tools)
    ACTION=${2}
    IFWAIT=${3:-}

    $0 tools_kafka_ui $ACTION && \
    $0 tools_mongo_express $ACTION && \
    $0 tools_telepresence $ACTION
    ;;
  od|openframe_datasources)
    ACTION=${2}
    IFWAIT=${3:-}

    $0 openframe_datasources_redis $ACTION
    $0 openframe_datasources_kafka $ACTION
    $0 openframe_datasources_mongodb $ACTION
    $0 openframe_datasources_mongodb_exporter $ACTION
    $0 openframe_datasources_cassandra $ACTION
    $0 openframe_datasources_nifi $ACTION
    $0 openframe_datasources_zookeeper $ACTION
    $0 openframe_datasources_pinot $ACTION
    ;;
  om|openframe_microservices)
    ACTION=${2}
    IFWAIT=${3:-}
    openframe_datasources_wait_all && \
    $0 openframe_microservices_openframe_config_server $ACTION &
    $0 openframe_microservices_openframe_api $ACTION &
    $0 openframe_microservices_openframe_management $ACTION &
    $0 openframe_microservices_openframe_stream $ACTION &
    $0 openframe_microservices_openframe_gateway $ACTION &
    $0 openframe_microservices_openframe_ui $ACTION &
    ;;
  itd|integrated_tools_datasources)
    ACTION=${2}
    IFWAIT=${3:-}

    $0 integrated_tools_datasources_fleet $ACTION
    $0 integrated_tools_datasources_authentik $ACTION
    $0 integrated_tools_datasources_meshcentral $ACTION
    $0 integrated_tools_datasources_tactical_rmm $ACTION
    ;;
  it|integrated_tools)
    ACTION=${2}
    IFWAIT=${3:-}

    $0 integrated_tools_fleet $ACTION &
    $0 integrated_tools_authentik $ACTION &
    $0 integrated_tools_meshcentral $ACTION &
    $0 integrated_tools_tactical_rmm $ACTION &
    ;;
  a|all)
    # ------------- ALL -------------
    ACTION=${2}
    IFWAIT=${3:-}

    $0 platform $ACTION && \
    $0 openframe_datasources $ACTION
    $0 integrated_tools_datasources $ACTION
    $0 openframe_microservices $ACTION
    $0 integrated_tools $ACTION
    $0 client_tools $ACTION
    $0 openframe_microservices_register_apps $ACTION
    echo
    echo "Wait for all apps to be ready. Deployment finished."
    ;;
  -h|--help|-Help)
    cat $0 | grep -v cat | grep ")" | tr -d ")" | tr -s "|" "," | tr -d "*"
    ;;
  *)
    echo "Unknown app: $APP"
    echo
    echo "Available apps:"
    cat $0 | grep -v cat | grep ")" | tr -d ")" | tr -s "|" "," | tr -d "*"
    exit 1
esac
