#!/bin/bash

# Source variables for cluster/registry names
. "$(dirname "$0")/functions/variables.sh"

# Source spinner functions
source "${SCRIPT_DIR}/functions/spinner.sh"
export -f start_spinner stop_spinner _spin

ARG=$1
APP=$2
NAMESPACE=$3
ACTION=$4
LOCAL_PORT=$5
REMOTE_PORT_NAME=$6

if [ "$ARG" != "''" ] && [ "$ACTION" == "" ]; then
  echo "Action is required: deploy, delete, dev, debug"
  exit 1
fi

case "$ARG" in
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
  fi
  ;;
argocd_apps)
  if [ "$ACTION" == "deploy" ]; then 
    kubectl -n argocd patch cm/argocd-cm --type=merge --patch-file "${ROOT_REPO_DIR}/manifests/argocd/patch-argocd-cm.yaml" >"${DEPLOY_LOG_DIR}/deploy-argocd-apps.log" 
    kubectl -n argocd patch deployment argocd-repo-server --type='merge' \
      -p='{"spec":{"template":{"spec":{"imagePullSecrets":[{"name":"docker-pat-secret"}]}}}}' >>"${DEPLOY_LOG_DIR}/deploy-argocd-apps.log" 
    kubectl -n argocd apply -k "${ROOT_REPO_DIR}/manifests/argocd" >>"${DEPLOY_LOG_DIR}/deploy-argocd-apps.log"

    start_spinner "Waiting for ArgoCD Apps to become Healthy"
    wait_for_argocd_apps >>"${DEPLOY_LOG_DIR}/deploy-argocd-apps.log"
    stop_spinner_and_return_code $? || exit 1 
    
  elif [ "$ACTION" == "delete" ]; then
    kubectl -n argocd delete -k "${ROOT_REPO_DIR}/manifests/argocd"
  elif [ "$ACTION" == "dev" ]; then
    echo "$APP is not supported in dev mode"
    exit 0
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
  fi
  ;;
openframe_microservices_register_apps)
  start_spinner "Registering apps"
  ${ROOT_REPO_DIR}/scripts/functions/register.sh >"${DEPLOY_LOG_DIR}/register-apps-deploy.log"
  stop_spinner_and_return_code $? || exit 1
  echo
  awk '/Fleet MDM Credentials:/ {i=NR} END {print i}' "${DEPLOY_LOG_DIR}/register-apps-deploy.log" |
    xargs -I{} awk 'NR >= {} && !/All ingresses:/ {print} /All ingresses:/ {exit}' "${DEPLOY_LOG_DIR}/register-apps-deploy.log"
  ;;
tools_telepresence)
  if [ "$ACTION" == "dev" ]; then
    echo "$APP is not supported in dev mode"
    exit 0
  elif [ "$ACTION" == "intercept" ]; then
    echo "$APP is not supported for debug mode"
  fi
  ;;
app)
  if [ "$ACTION" == "dev" ]; then
    echo "Deploying ${APP} at ${NAMESPACE} in dev mode"
    case "$APP" in
      *openframe*)
        cd "${ROOT_REPO_DIR}/openframe/services/${APP}"
        ;;
      meshcentral)
        cd "${ROOT_REPO_DIR}/${NAMESPACE}/${APP}/server"
        ;;
      *)
        cd "${ROOT_REPO_DIR}/${NAMESPACE}/${APP}"
        ;;
    esac

    skaffold dev --cache-artifacts=false -n $NAMESPACE ||
      echo "$APP is not supported in dev mode" && exit 0
  elif [ "$ACTION" == "intercept" ]; then
    intercept_app "$APP" "$NAMESPACE" "$LOCAL_PORT" "$REMOTE_PORT_NAME"
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
  echo "Unknown arg: $ARG"
  echo
  echo "Available apps:"
  cat $0 | grep -v cat | grep ")" | tr -d ")" | tr -s "|" "," | tr -d "*"
  ;;
esac
