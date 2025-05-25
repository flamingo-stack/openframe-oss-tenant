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
argocd)
  if [ "$ACTION" == "deploy" ]; then
    start_spinner "Deploying ArgoCD"
    deploy_argocd >"${DEPLOY_LOG_DIR}/deploy-argocd.log"
    stop_spinner_and_return_code $? || exit 1 
  elif [ "$ACTION" == "delete" ]; then
    delete_argocd
  elif [ "$ACTION" == "dev" ]; then
    echo "$APP is not supported in dev mode"
    exit 0
  elif [ "$ACTION" == "debug" ]; then
    echo "$APP is not supported for debug mode"
  fi
  ;;
argocd_apps)
  if [ "$ACTION" == "deploy" ]; then
    start_spinner "Deploying Platform Apps"
    kubectl -n argocd apply -f "${SCRIPT_DIR}/manifests/repo-secret.yaml" >"${DEPLOY_LOG_DIR}/deploy-argocd-apps.log" 
    kubectl -n argocd apply -f "${SCRIPT_DIR}/manifests/argocd-apps.yaml" >>"${DEPLOY_LOG_DIR}/deploy-argocd-apps.log"
    wait_for_argocd_apps >"${DEPLOY_LOG_DIR}/deploy-argocd-apps.log"
    stop_spinner_and_return_code $? || exit 1 
  elif [ "$ACTION" == "delete" ]; then
    kubectl -n argocd delete -f "${SCRIPT_DIR}/manifests/repo-secret.yaml"
    kubectl -n argocd delete -f "${SCRIPT_DIR}/manifests/argocd-apps.yaml"
  elif [ "$ACTION" == "dev" ]; then
    echo "$APP is not supported in dev mode"
    exit 0
  elif [ "$ACTION" == "debug" ]; then
    echo "$APP is not supported for debug mode"
  fi
  ;;
pki_cert)
  if [ "$ACTION" == "deploy" ]; then
    start_spinner "Add Trusted PKI certificates"
    trust_ca > "${DEPLOY_LOG_DIR}/pki.log"
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
openframe_datasources_nifi)
  if [ "$ACTION" == "dev" ]; then
    echo "Deploying NiFi in dev mode"
    cd ${SCRIPT_DIR}/../openframe/datasources/nifi/
    skaffold dev --cache-artifacts=false -n datasources
  elif [ "$ACTION" == "intercept" ]; then
    echo "Interception not enabled for this app"
  fi
  ;;
openframe_microservices_openframe_config_server)
  if [ "$ACTION" == "dev" ]; then
    echo "Deploying Config Server in dev mode"
    cd ${ROOT_REPO_DIR}/openframe/services/openframe-config
    skaffold dev --cache-artifacts=false -n microservices
  elif [ "$ACTION" == "intercept" ]; then
    intercept_app "openframe-config-server" "microservices" "$LOCAL_PORT" "$REMOTE_PORT_NAME"
  fi
  ;;
openframe_microservices_openframe_api)
  if [ "$ACTION" == "dev" ]; then
    echo "Deploying API in dev mode"
    cd ${ROOT_REPO_DIR}/openframe/services/openframe-api
    skaffold dev --cache-artifacts=false -n microservices
  elif [ "$ACTION" == "intercept" ]; then
    intercept_app "openframe-api" "microservices" "$LOCAL_PORT" "$REMOTE_PORT_NAME"
  fi
  ;;
openframe_microservices_openframe_management)
  if [ "$ACTION" == "dev" ]; then
    echo "Deploying Management in dev mode"
    cd ${ROOT_REPO_DIR}/openframe/services/openframe-management
    skaffold dev --cache-artifacts=false -n microservices
  elif [ "$ACTION" == "intercept" ]; then
    echo "Interception not enabled for this app"
  fi
  ;;
openframe_microservices_openframe_stream)
  if [ "$ACTION" == "dev" ]; then
    echo "Deploying Stream in dev mode"
    cd ${ROOT_REPO_DIR}/openframe/services/openframe-stream
    skaffold dev --cache-artifacts=false -n microservices
  elif [ "$ACTION" == "intercept" ]; then
    intercept_app "openframe-stream" "microservices" "$LOCAL_PORT" "$REMOTE_PORT_NAME"
  fi
  ;;
openframe_microservices_openframe_gateway)
  if [ "$ACTION" == "dev" ]; then
    echo "Deploying Gateway in dev mode"
    cd ${ROOT_REPO_DIR}/openframe/services/openframe-gateway
    skaffold dev --cache-artifacts=false -n microservices
  elif [ "$ACTION" == "intercept" ]; then
    intercept_app "openframe-gateway" "microservices" "$LOCAL_PORT" "$REMOTE_PORT_NAME"
  fi
  ;;
openframe_microservices_openframe_ui)
  if [ "$ACTION" == "dev" ]; then
    echo "Deploying OpenFrame UI in dev mode"
    cd ${ROOT_REPO_DIR}/openframe/services/openframe-ui
    skaffold dev --cache-artifacts=false -n microservices
  elif [ "$ACTION" == "intercept" ]; then
    intercept_app "openframe-ui" "microservices" "$LOCAL_PORT" "$REMOTE_PORT_NAME"
  fi
  ;;
openframe_microservices_register_apps)
  start_spinner "Registering apps"
  openframe_microservices_openframe_management_wait >/dev/null &&
    integrated_tools_wait_all >/dev/null &&
      ${ROOT_REPO_DIR}/scripts/functions/register.sh >"${DEPLOY_LOG_DIR}/register-apps-deploy.log"
  stop_spinner_and_return_code $? || exit 1
  echo
  sed -n '/Fleet MDM Credentials:/,/All ingresses/p' "${DEPLOY_LOG_DIR}/register-apps-deploy.log" | sed '$d'
  ;;
integrated_tools_datasources_fleet)
  if [ "$ACTION" == "dev" ]; then
    echo "Deploying Fleet in dev mode"
    cd ${ROOT_REPO_DIR}/integrated-tools/fleetmdm
    skaffold dev --cache-artifacts=false -n integrated-tools
  elif [ "$ACTION" == "intercept" ]; then
    echo "Interception not enabled for this app"
  fi
  ;;
integrated_tools_fleet)
  if [ "$ACTION" == "dev" ]; then
    echo "Deploying Fleet in dev mode"
    cd ${ROOT_REPO_DIR}/integrated-tools/fleetmdm
    skaffold dev --cache-artifacts=false -n integrated-tools
  elif [ "$ACTION" == "intercept" ]; then
    echo "Interception not enabled for this app"
  fi
  ;;
integrated_tools_meshcentral)
  if [ "$ACTION" == "dev" ]; then
    echo "Deploying MeshCentral in dev mode"
    cd ${ROOT_REPO_DIR}/integrated-tools/meshcentral/server
    skaffold dev --cache-artifacts=false -n integrated-tools
  elif [ "$ACTION" == "intercept" ]; then
    intercept_app "meshcentral" "integrated-tools" "$LOCAL_PORT" "$REMOTE_PORT_NAME"
  fi
  ;;
tools_telepresence)
  if [ "$ACTION" == "deploy" ]; then
    tools_telepresence_deploy >>"${DEPLOY_LOG_DIR}/tools-telepresence-deploy.log"
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
a | all)
  # ------------- ALL -------------
  ACTION=${2}
  IFWAIT=${3:-}

  $0 argocd $ACTION &&
    $0 argocd_apps $ACTION &&
    $0 pki_cert $ACTION &&
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