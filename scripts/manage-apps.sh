#!/bin/bash

# Source variables for cluster/registry names
. "$(dirname "$0")/functions/variables.sh"

# Source spinner functions
source "${SCRIPT_DIR}/functions/spinner.sh"
export -f start_spinner stop_spinner _spin

APP=$1
ACTION=$2
LOCAL_PORT=$3
REMOTE_PORT_NAME=$4

if [ "$APP" != "''" ] && [ "$ACTION" == "" ]; then
  echo "Action is required: deploy, delete, dev, debug"
  exit 1
fi

case "$APP" in
platform_pki)
  if [ "$ACTION" == "deploy" ]; then
    start_spinner "Add Trusted PKI certificates"
    trust_ca > "${DEPLOY_LOG_DIR}/pki.log" 2>&1
    stop_spinner_and_return_code $? || exit 1
  elif [ "$ACTION" == "delete" ]; then
    untrust_ca
  elif [ "$ACTION" == "dev" ]; then
    echo "$APP is not supported in dev mode"
    exit 0
  elif [ "$ACTION" == "debug" ]; then
    echo "$APP is not supported for debug mode"
  fi
  ;;
platform_addons)
  if [ "$ACTION" == "deploy" ]; then
    start_spinner "Deploying Platform Addons"
    deploy_argocd 2>&1 >"${DEPLOY_LOG_DIR}/platform-addons-deploy.log"
    argocd_client 2>&1 >"${DEPLOY_LOG_DIR}/platform-addons-deploy.log"
    kubectl -n argocd apply -f "${SCRIPT_DIR}/functions/argocd-apps.yaml" 2>&1 >"${DEPLOY_LOG_DIR}/platform-addons-deploy.log"
    stop_spinner_and_return_code $? || exit 1 
  elif [ "$ACTION" == "delete" ]; then
    kubectl -n argocd delete -f "${SCRIPT_DIR}/functions/argocd-apps.yaml"
    delete_argocd
  elif [ "$ACTION" == "dev" ]; then
    echo "$APP is not supported in dev mode"
    exit 0
  elif [ "$ACTION" == "debug" ]; then
    echo "$APP is not supported for debug mode"
  fi
  ;;
platform_ingress_nginx)
  if [ "$ACTION" == "deploy" ]; then
    start_spinner "Deploying Platform Ingress Nginx"
    platform_ingress_nginx_deploy 2>&1 >"${DEPLOY_LOG_DIR}/platform-ingress-nginx-deploy.log"
    stop_spinner_and_return_code $? || exit 1
    
  elif [ "$ACTION" == "delete" ]; then
    platform_ingress_nginx_delete
  elif [ "$ACTION" == "dev" ]; then
    echo "$APP is not supported in dev mode"
    exit 0
  elif [ "$ACTION" == "intercept" ]; then
    echo "$APP is not supported for debug mode"
  fi
  ;;
platform_monitoring)
  if [ "$ACTION" == "deploy" ]; then
    start_spinner "Deploying Platform Monitoring"
    platform_monitoring_deploy 2>&1 >"${DEPLOY_LOG_DIR}/platform-monitoring-deploy.log"
    stop_spinner_and_return_code $? || exit 1

    start_spinner "Waiting for Platform Monitoring to be ready"
    platform_monitoring_wait 2>&1 >>"${DEPLOY_LOG_DIR}/platform-monitoring-deploy.log"
    echo "Platform Monitoring deployed" >>"${DEPLOY_LOG_DIR}/platform-monitoring-deploy.log"
    stop_spinner_and_return_code $? || exit 1
  elif [ "$ACTION" == "delete" ]; then
    platform_monitoring_delete
  elif [ "$ACTION" == "dev" ]; then
    echo "$APP is not supported in dev mode"
    exit 0
  elif [ "$ACTION" == "intercept" ]; then
    echo "$APP is not supported for debug mode"
  fi
  ;;
platform_logging)
  if [ "$ACTION" == "deploy" ]; then
    start_spinner "Deploying Platform Logging"
    platform_logging_deploy 2>&1 >"${DEPLOY_LOG_DIR}/platform-logging-deploy.log"
    stop_spinner_and_return_code $? || exit 1

    start_spinner "Waiting for Platform Logging to be ready"
    platform_logging_wait 2>&1 >>"${DEPLOY_LOG_DIR}/platform-logging-deploy.log"
    echo "Platform Logging deployed" >>"${DEPLOY_LOG_DIR}/platform-logging-deploy.log"
    stop_spinner_and_return_code $? || exit 1
  elif [ "$ACTION" == "delete" ]; then
    platform_logging_delete
  elif [ "$ACTION" == "dev" ]; then
    echo "$APP is not supported in dev mode"
    exit 0
  elif [ "$ACTION" == "intercept" ]; then
    echo "$APP is not supported for debug mode"
  fi
  ;;
platform_efk)
  if [ "$ACTION" == "deploy" ]; then
    start_spinner "Deploying Platform EFK"
    platform_efk_deploy 2>&1 >"${DEPLOY_LOG_DIR}/platform-efk-deploy.log"
    stop_spinner_and_return_code $? || exit 1

    start_spinner "Waiting for Platform EFK to be ready"
    platform_efk_wait 2>&1 >>"${DEPLOY_LOG_DIR}/platform-efk-deploy.log"
    echo "Platform EFK deployed" >>"${DEPLOY_LOG_DIR}/platform-efk-deploy.log"
    stop_spinner_and_return_code $? || exit 1
  elif [ "$ACTION" == "delete" ]; then
    platform_efk_delete
  elif [ "$ACTION" == "dev" ]; then
    echo "$APP is not supported in dev mode"
    exit 0
  elif [ "$ACTION" == "intercept" ]; then
    echo "$APP is not supported for debug mode"
  fi
  ;;
openframe_datasources_redis)
  if [ "$ACTION" == "deploy" ]; then
    openframe_datasources_redis_deploy 2>&1 >"${DEPLOY_LOG_DIR}/openframe-datasources-redis-deploy.log"
  elif [ "$ACTION" == "delete" ]; then
    openframe_datasources_redis_delete
  elif [ "$ACTION" == "dev" ]; then
    echo "$APP is not supported in dev mode"
    exit 0
  elif [ "$ACTION" == "intercept" ]; then
    echo "Interception not enabled for this app"
  fi
  ;;
openframe_datasources_kafka)
  if [ "$ACTION" == "deploy" ]; then
    openframe_datasources_kafka_deploy 2>&1 >"${DEPLOY_LOG_DIR}/openframe-datasources-kafka-deploy.log"
  elif [ "$ACTION" == "delete" ]; then
    openframe_datasources_kafka_delete
  elif [ "$ACTION" == "dev" ]; then
    echo "$APP is not supported in dev mode"
    exit 0
  elif [ "$ACTION" == "intercept" ]; then
    echo "Interception not enabled for this app"
  fi
  ;;
openframe_datasources_mongodb)
  if [ "$ACTION" == "deploy" ]; then
    openframe_datasources_mongodb_deploy 2>&1 >"${DEPLOY_LOG_DIR}/openframe-datasources-mongodb-deploy.log"
  elif [ "$ACTION" == "delete" ]; then
    openframe_datasources_mongodb_delete
  elif [ "$ACTION" == "dev" ]; then
    echo "$APP is not supported in dev mode"
    exit 0
  elif [ "$ACTION" == "intercept" ]; then
    echo "Interception not enabled for this app"
  fi
  ;;
openframe_datasources_mongodb_exporter)
  if [ "$ACTION" == "deploy" ]; then
    openframe_datasources_mongodb_exporter_deploy 2>&1 >"${DEPLOY_LOG_DIR}/openframe-datasources-mongodb-exporter-deploy.log"
  elif [ "$ACTION" == "delete" ]; then
    openframe_datasources_mongodb_exporter_delete
  elif [ "$ACTION" == "dev" ]; then
    echo "$APP is not supported in dev mode"
    exit 0
  elif [ "$ACTION" == "intercept" ]; then
    echo "$APP is not supported for debug mode"
  fi
  ;;
openframe_datasources_cassandra)
  if [ "$ACTION" == "deploy" ]; then
    openframe_datasources_cassandra_deploy 2>&1 >"${DEPLOY_LOG_DIR}/openframe-datasources-cassandra-deploy.log"
  elif [ "$ACTION" == "delete" ]; then
    openframe_datasources_cassandra_delete
  elif [ "$ACTION" == "dev" ]; then
    echo "$APP is not supported in dev mode"
    exit 0
  elif [ "$ACTION" == "intercept" ]; then
    echo "Interception not enabled for this app"
  fi
  ;;
openframe_datasources_nifi)
  if [ "$ACTION" == "deploy" ]; then
    openframe_datasources_nifi_deploy 2>&1 >"${DEPLOY_LOG_DIR}/openframe-datasources-nifi-deploy.log"
  elif [ "$ACTION" == "delete" ]; then
    openframe_datasources_nifi_delete
  elif [ "$ACTION" == "dev" ]; then
    echo "Deploying NiFi in dev mode"
    cd ${SCRIPT_DIR}/../openframe/datasources/nifi/
    skaffold dev --cache-artifacts=false -n openframe-datasources
  elif [ "$ACTION" == "intercept" ]; then
    echo "Interception not enabled for this app"
  fi
  ;;
openframe_datasources_zookeeper)
  if [ "$ACTION" == "deploy" ]; then
    openframe_datasources_zookeeper_deploy 2>&1 >"${DEPLOY_LOG_DIR}/openframe-datasources-zookeeper-deploy.log"
  elif [ "$ACTION" == "delete" ]; then
    openframe_datasources_zookeeper_delete
  elif [ "$ACTION" == "dev" ]; then
    echo "$APP is not supported in dev mode"
    exit 0
  elif [ "$ACTION" == "intercept" ]; then
    echo "Interception not enabled for this app"
  fi
  ;;
openframe_datasources_pinot)
  if [ "$ACTION" == "deploy" ]; then
    openframe_datasources_pinot_deploy 2>&1 >"${DEPLOY_LOG_DIR}/openframe-datasources-pinot-deploy.log"
  elif [ "$ACTION" == "delete" ]; then
    openframe_datasources_pinot_delete
  elif [ "$ACTION" == "dev" ]; then
    echo "$APP is not supported in dev mode"
    exit 0
  elif [ "$ACTION" == "intercept" ]; then
    echo "Interception not enabled for this app"
  fi
  ;;
openframe_microservices_openframe_config_server)
  if [ "$ACTION" == "deploy" ]; then
    openframe_microservices_openframe_config_server_deploy 2>&1 >"${DEPLOY_LOG_DIR}/openframe-microservices-openframe-config-server-deploy.log"
  elif [ "$ACTION" == "delete" ]; then
    openframe_microservices_openframe_config_server_delete
  elif [ "$ACTION" == "dev" ]; then
    echo "Deploying Config Server in dev mode"
    cd ${ROOT_REPO_DIR}/openframe/services/openframe-config
    skaffold dev --cache-artifacts=false -n openframe-microservices
  elif [ "$ACTION" == "intercept" ]; then
    intercept_app "openframe-config-server" "openframe-microservices" "$LOCAL_PORT" "$REMOTE_PORT_NAME"
  fi
  ;;
openframe_microservices_openframe_api)
  if [ "$ACTION" == "deploy" ]; then
    openframe_microservices_openframe_api_deploy 2>&1 >"${DEPLOY_LOG_DIR}/openframe-microservices-openframe-api-deploy.log"
  elif [ "$ACTION" == "delete" ]; then
    openframe_microservices_openframe_api_delete
  elif [ "$ACTION" == "dev" ]; then
    echo "Deploying API in dev mode"
    cd ${ROOT_REPO_DIR}/openframe/services/openframe-api
    skaffold dev --cache-artifacts=false -n openframe-microservices
  elif [ "$ACTION" == "intercept" ]; then
    intercept_app "openframe-api" "openframe-microservices" "$LOCAL_PORT" "$REMOTE_PORT_NAME"
  fi
  ;;
openframe_microservices_openframe_management)
  if [ "$ACTION" == "deploy" ]; then
    openframe_microservices_openframe_management_deploy 2>&1 >"${DEPLOY_LOG_DIR}/openframe-microservices-openframe-management-deploy.log"
  elif [ "$ACTION" == "delete" ]; then
    openframe_microservices_openframe_management_delete
  elif [ "$ACTION" == "dev" ]; then
    echo "Deploying Management in dev mode"
    cd ${ROOT_REPO_DIR}/openframe/services/openframe-management
    skaffold dev --cache-artifacts=false -n openframe-microservices
  elif [ "$ACTION" == "intercept" ]; then
    echo "Interception not enabled for this app"
  fi
  ;;
openframe_microservices_openframe_stream)
  if [ "$ACTION" == "deploy" ]; then
    openframe_microservices_openframe_stream_deploy 2>&1 >"${DEPLOY_LOG_DIR}/openframe-microservices-openframe-stream-deploy.log"
  elif [ "$ACTION" == "delete" ]; then
    openframe_microservices_openframe_stream_delete
  elif [ "$ACTION" == "dev" ]; then
    echo "Deploying Stream in dev mode"
    cd ${ROOT_REPO_DIR}/openframe/services/openframe-stream
    skaffold dev --cache-artifacts=false -n openframe-microservices
  elif [ "$ACTION" == "intercept" ]; then
    intercept_app "openframe-stream" "openframe-microservices" "$LOCAL_PORT" "$REMOTE_PORT_NAME"
  fi
  ;;
openframe_microservices_openframe_gateway)
  if [ "$ACTION" == "deploy" ]; then
    openframe_microservices_openframe_gateway_deploy 2>&1 >"${DEPLOY_LOG_DIR}/openframe-microservices-openframe-gateway-deploy.log"
  elif [ "$ACTION" == "delete" ]; then
    openframe_microservices_openframe_gateway_delete
  elif [ "$ACTION" == "dev" ]; then
    echo "Deploying Gateway in dev mode"
    cd ${ROOT_REPO_DIR}/openframe/services/openframe-gateway
    skaffold dev --cache-artifacts=false -n openframe-microservices
  elif [ "$ACTION" == "intercept" ]; then
    intercept_app "openframe-gateway" "openframe-microservices" "$LOCAL_PORT" "$REMOTE_PORT_NAME"
  fi
  ;;
openframe_microservices_openframe_ui)
  if [ "$ACTION" == "deploy" ]; then
    openframe_microservices_openframe_ui_deploy 2>&1 >"${DEPLOY_LOG_DIR}/openframe-microservices-openframe-ui-deploy.log"
  elif [ "$ACTION" == "delete" ]; then
    openframe_microservices_openframe_ui_delete
  elif [ "$ACTION" == "dev" ]; then
    echo "Deploying OpenFrame UI in dev mode"
    cd ${ROOT_REPO_DIR}/openframe/services/openframe-ui
    skaffold dev --cache-artifacts=false -n openframe-microservices
  elif [ "$ACTION" == "intercept" ]; then
    intercept_app "openframe-ui" "openframe-microservices" "$LOCAL_PORT" "$REMOTE_PORT_NAME"
  fi
  ;;
openframe_microservices_register_apps)
  # kubectl -n infrastructure apply -f ./deploy/dev/jobs/register-tools.yaml && \
  # kubectl -n infrastructure wait --for=condition=Ready pod -l app=register-tools --timeout 20m
  start_spinner "Registering apps"
  openframe_microservices_openframe_management_wait >/dev/null 2>&1 &&
    integrated_tools_wait_all >/dev/null 2>&1 &&
      ${ROOT_REPO_DIR}/deploy/dev/openframe-microservices/register/register.sh >"${DEPLOY_LOG_DIR}/openframe-microservices-register-apps-deploy.log" 2>&1
  stop_spinner_and_return_code $? || exit 1
  echo
  sed -n '/Fleet MDM Credentials:/,/All ingresses/p' "${DEPLOY_LOG_DIR}/openframe-microservices-register-apps-deploy.log" | sed '$d'
  ;;
integrated_tools_datasources_fleet)
  if [ "$ACTION" == "deploy" ]; then
    integrated_tools_datasources_fleet_deploy 2>&1 >"${DEPLOY_LOG_DIR}/integrated-tools-datasources-fleet-deploy.log"
  elif [ "$ACTION" == "delete" ]; then
    integrated_tools_datasources_fleet_delete
  elif [ "$ACTION" == "dev" ]; then
    echo "Deploying Fleet in dev mode"
    cd ${ROOT_REPO_DIR}/integrated-tools/fleetmdm
    skaffold dev --cache-artifacts=false -n integrated-tools-datasources
  elif [ "$ACTION" == "intercept" ]; then
    echo "Interception not enabled for this app"
  fi
  ;;
integrated_tools_fleet)
  if [ "$ACTION" == "deploy" ]; then
    integrated_tools_datasources_fleet_wait 2>&1 >>"${DEPLOY_LOG_DIR}/integrated-tools-datasources-fleet-deploy.log" &&
      integrated_tools_fleet_deploy 2>&1 >>"${DEPLOY_LOG_DIR}/integrated-tools-fleet-deploy.log"
  elif [ "$ACTION" == "delete" ]; then
    integrated_tools_fleet_delete
  elif [ "$ACTION" == "dev" ]; then
    echo "Deploying Fleet in dev mode"
    cd ${ROOT_REPO_DIR}/integrated-tools/fleetmdm
    skaffold dev --cache-artifacts=false -n integrated-tools
  elif [ "$ACTION" == "intercept" ]; then
    echo "Interception not enabled for this app"
  fi
  ;;
integrated_tools_datasources_authentik)
  if [ "$ACTION" == "deploy" ]; then
    integrated_tools_datasources_authentik_deploy 2>&1 >"${DEPLOY_LOG_DIR}/integrated-tools-datasources-authentik-deploy.log"
  elif [ "$ACTION" == "delete" ]; then
    integrated_tools_datasources_authentik_delete
  elif [ "$ACTION" == "dev" ]; then
    echo "$APP is not supported in dev mode"
    exit 0
  elif [ "$ACTION" == "intercept" ]; then
    echo "Interception not enabled for this app"
  fi
  ;;
integrated_tools_authentik)
  if [ "$ACTION" == "deploy" ]; then
    integrated_tools_datasources_authentik_wait 2>&1 >>"${DEPLOY_LOG_DIR}/integrated-tools-datasources-authentik-deploy.log" &&
      integrated_tools_authentik_deploy 2>&1 >>"${DEPLOY_LOG_DIR}/integrated-tools-authentik-deploy.log"
  elif [ "$ACTION" == "delete" ]; then
    integrated_tools_authentik_delete
  elif [ "$ACTION" == "dev" ]; then
    echo "$APP is not supported in dev mode"
    exit 0
  elif [ "$ACTION" == "intercept" ]; then
    echo "Interception not enabled for this app"
  fi
  ;;
integrated_tools_datasources_meshcentral)
  if [ "$ACTION" == "deploy" ]; then
    integrated_tools_datasources_meshcentral_deploy 2>&1 >"${DEPLOY_LOG_DIR}/integrated-tools-datasources-meshcentral-deploy.log"
  elif [ "$ACTION" == "delete" ]; then
    integrated_tools_datasources_meshcentral_delete
  elif [ "$ACTION" == "dev" ]; then
    echo "$APP is not supported in dev mode"
    exit 0
  elif [ "$ACTION" == "intercept" ]; then
    echo "Interception not enabled for this app"
  fi
  ;;
integrated_tools_meshcentral)
  if [ "$ACTION" == "deploy" ]; then
    integrated_tools_datasources_meshcentral_wait 2>&1 >>"${DEPLOY_LOG_DIR}/integrated-tools-datasources-meshcentral-deploy.log" &&
      integrated_tools_meshcentral_deploy 2>&1 >>"${DEPLOY_LOG_DIR}/integrated-tools-meshcentral-deploy.log"
  elif [ "$ACTION" == "delete" ]; then
    integrated_tools_meshcentral_delete
  elif [ "$ACTION" == "dev" ]; then
    echo "Deploying MeshCentral in dev mode"
    cd ${ROOT_REPO_DIR}/integrated-tools/meshcentral/server
    skaffold dev --cache-artifacts=false -n integrated-tools
  elif [ "$ACTION" == "intercept" ]; then
    intercept_app "meshcentral" "integrated-tools" "$LOCAL_PORT" "$REMOTE_PORT_NAME"
  fi
  ;;
integrated_tools_datasources_tactical_rmm)
  if [ "$ACTION" == "deploy" ]; then
    integrated_tools_datasources_tactical_rmm_deploy 2>&1 >"${DEPLOY_LOG_DIR}/integrated-tools-datasources-tactical-rmm-deploy.log"
  elif [ "$ACTION" == "delete" ]; then
    integrated_tools_datasources_tactical_rmm_delete
  elif [ "$ACTION" == "dev" ]; then
    echo "$APP is not supported in dev mode"
    exit 0
  elif [ "$ACTION" == "intercept" ]; then
    echo "Interception not enabled for this app"
  fi
  ;;
integrated_tools_tactical_rmm)
  if [ "$ACTION" == "deploy" ]; then
    integrated_tools_datasources_tactical_rmm_wait 2>&1 >>"${DEPLOY_LOG_DIR}/integrated-tools-datasources-tactical-rmm-deploy.log" &&
      integrated_tools_tactical_rmm_deploy 2>&1 >>"${DEPLOY_LOG_DIR}/integrated-tools-tactical-rmm-deploy.log"
  elif [ "$ACTION" == "delete" ]; then
    integrated_tools_tactical_rmm_delete
  elif [ "$ACTION" == "dev" ]; then
    echo "$APP is not supported in dev mode"
    exit 0
  elif [ "$ACTION" == "intercept" ]; then
    echo "Interception not enabled for this app"
  fi
  ;;
tools_kafka_ui)
  if [ "$ACTION" == "deploy" ]; then
    openframe_datasources_kafka_wait >/dev/null 2>&1 &&
      tools_kafka_ui_deploy 2>&1 >>"${DEPLOY_LOG_DIR}/tools-kafka-ui-deploy.log"
  elif [ "$ACTION" == "delete" ]; then
    tools_kafka_ui_delete
  elif [ "$ACTION" == "dev" ]; then
    echo "$APP is not supported in dev mode"
    exit 0
  elif [ "$ACTION" == "intercept" ]; then
    echo "$APP is not supported for debug mode"
  fi
  ;;
tools_mongo_express)
  if [ "$ACTION" == "deploy" ]; then
    openframe_datasources_mongodb_wait >/dev/null 2>&1 &&
      tools_mongo_express_deploy 2>&1 >>"${DEPLOY_LOG_DIR}/tools-mongo-express-deploy.log"
  elif [ "$ACTION" == "delete" ]; then
    tools_mongo_express_delete
  elif [ "$ACTION" == "dev" ]; then
    echo "$APP is not supported in dev mode"
    exit 0
  elif [ "$ACTION" == "intercept" ]; then
    echo "$APP is not supported for debug mode"
  fi
  ;;
tools_telepresence)
  if [ "$ACTION" == "deploy" ]; then
    tools_telepresence_deploy 2>&1 >>"${DEPLOY_LOG_DIR}/tools-telepresence-deploy.log"
  elif [ "$ACTION" == "delete" ]; then
    tools_telepresence_delete
  elif [ "$ACTION" == "dev" ]; then
    echo "$APP is not supported in dev mode"
    exit 0
  elif [ "$ACTION" == "intercept" ]; then
    echo "$APP is not supported for debug mode"
  fi
  ;;
# BUNDLE APPS
o | observability)
  ACTION=${2}
  IFWAIT=${3:-}

  $0 platform_monitoring $ACTION &&
    $0 platform_logging $ACTION
  # $0 platform_metrics_server $ACTION
  ;;
p | platform)
  ACTION=${2}
  IFWAIT=${3:-}

  $0 platform_addons $ACTION &&
    $0 observability $ACTION
  ;;
t | client_tools)
  ACTION=${2}
  IFWAIT=${3:-}

  $0 tools_kafka_ui $ACTION &&
    $0 tools_mongo_express $ACTION &&
    $0 tools_telepresence $ACTION
  ;;
od | openframe_datasources)
  ACTION=${2}
  IFWAIT=${3:-}

  start_spinner "Deploying OpenFrame Datasources"
  $0 openframe_datasources_redis $ACTION &&
    $0 openframe_datasources_kafka $ACTION &&
    $0 openframe_datasources_mongodb $ACTION &&
    $0 openframe_datasources_mongodb_exporter $ACTION &&
    $0 openframe_datasources_cassandra $ACTION &&
    $0 openframe_datasources_nifi $ACTION &&
    $0 openframe_datasources_zookeeper $ACTION &&
    $0 openframe_datasources_pinot $ACTION
  stop_spinner_and_return_code $? || exit 1
  ;;
om | openframe_microservices)
  ACTION=${2}
  IFWAIT=${3:-}

  start_spinner "Waiting for OpenFrame Datasources to be ready" &&
    openframe_datasources_redis_wait 2>&1 >>"${DEPLOY_LOG_DIR}/openframe-datasources-redis-deploy.log" &&
    openframe_datasources_kafka_wait 2>&1 >>"${DEPLOY_LOG_DIR}/openframe-datasources-kafka-deploy.log" &&
    openframe_datasources_mongodb_wait 2>&1 >>"${DEPLOY_LOG_DIR}/openframe-datasources-mongodb-deploy.log" &&
    openframe_datasources_mongodb_exporter_wait 2>&1 >>"${DEPLOY_LOG_DIR}/openframe-datasources-mongodb-exporter-deploy.log" &&
    openframe_datasources_cassandra_wait 2>&1 >>"${DEPLOY_LOG_DIR}/openframe-datasources-cassandra-deploy.log" &&
    openframe_datasources_zookeeper_wait 2>&1 >>"${DEPLOY_LOG_DIR}/openframe-datasources-zookeeper-deploy.log" &&
    openframe_datasources_nifi_wait 2>&1 >>"${DEPLOY_LOG_DIR}/openframe-datasources-nifi-deploy.log" &&
    openframe_datasources_pinot_wait 2>&1 >>"${DEPLOY_LOG_DIR}/openframe-datasources-pinot-deploy.log" &&
    stop_spinner_and_return_code $? || exit 1

    start_spinner "Deploying OpenFrame Microservices" &&
    $0 openframe_microservices_openframe_config_server $ACTION &&
    $0 openframe_microservices_openframe_api $ACTION &&
    $0 openframe_microservices_openframe_management $ACTION &&
    $0 openframe_microservices_openframe_stream $ACTION &&
    $0 openframe_microservices_openframe_gateway $ACTION &&
    $0 openframe_microservices_openframe_ui $ACTION
  stop_spinner_and_return_code $? || exit 1
  ;;
itd | integrated_tools_datasources)
  ACTION=${2}
  IFWAIT=${3:-}

  start_spinner "Deploying Integrated Tools Datasources" &&
    $0 integrated_tools_datasources_fleet $ACTION &&
    $0 integrated_tools_datasources_authentik $ACTION &&
    $0 integrated_tools_datasources_meshcentral $ACTION &&
    $0 integrated_tools_datasources_tactical_rmm $ACTION
  stop_spinner_and_return_code $? || exit 1
  ;;
it | integrated_tools)
  ACTION=${2}
  IFWAIT=${3:-}

  start_spinner "Deploying Integrated Tools" &&
    $0 integrated_tools_fleet $ACTION &&
    $0 integrated_tools_authentik $ACTION &&
    $0 integrated_tools_meshcentral $ACTION &&
    $0 integrated_tools_tactical_rmm $ACTION
  stop_spinner_and_return_code $? || exit 1
  ;;
dat | datasources)
  ACTION=${2}
  IFWAIT=${3:-}

  $0 openframe_datasources $ACTION
  $0 integrated_tools_datasources $ACTION
  ;;
stateless)
  ACTION=${2}
  IFWAIT=${3:-}

  $0 openframe_microservices $ACTION
  $0 integrated_tools $ACTION
  ;;
a | all)
  # ------------- ALL -------------
  ACTION=${2}
  IFWAIT=${3:-}

  $0 platform $ACTION &&
    $0 platform_pki $ACTION &&
    $0 datasources $ACTION &&
    $0 stateless $ACTION &&
    $0 openframe_microservices_register_apps $ACTION
  ;;
-h | --help | -Help | help)
  cat $0 | grep -v cat | grep ")" | tr -d ")" | tr -s "|" "," | tr -d "*"
  ;;
*)
  echo "Unknown app: $APP"
  echo
  echo "Available apps:"
  cat $0 | grep -v cat | grep ")" | tr -d ")" | tr -s "|" "," | tr -d "*"
  ;;
esac
