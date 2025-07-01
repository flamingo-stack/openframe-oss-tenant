#!/bin/bash

# Source variables for cluster/registry names
. "$(dirname "$0")/functions/variables.sh"

# Source spinner functions
source "${SCRIPT_DIR}/functions/spinner.sh"
export -f start_spinner stop_spinner _spin

ARG=$1
ACTION=$2

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
  elif [ "$ACTION" == "secret" ]; then
    get_initial_secret
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
app)
  NAMESPACE=$2
  APP=$3
  ACTION=$4
  ARG1=$5
  ARG2=$6

  if [ -z "$NAMESPACE" ] || [ -z "$APP" ]; then
    echo "NAMESPACE and APP names are required"
    echo "Example: ./scripts/run.sh app <namespace> <app> <command> <args>"
    echo "Example: ./scripts/run.sh app microservices openframe-api intercept 8090 http"
    exit 1
  fi

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
    skaffold dev --cache-artifacts=false -n $NAMESPACE
  elif [ "$ACTION" == "intercept" ]; then
    echo "Intercepting ${APP} at ${NAMESPACE} in intercept mode"
    intercept_app "$APP" "$NAMESPACE" "$ARG1" "$ARG2"
  elif [ "$ACTION" == "health" ]; then
    echo "Branch '${ARG1}' autosync is ${ARG2} for ${APP}"
    switch_argocd_app_health "$APP" "$ARG1" "$ARG2"
  fi
  ;;
# BUNDLE APPS
a | all)
  ACTION=${2}

  $0 argocd $ACTION &&
    $0 argocd_apps $ACTION &&
    $0 pki_cert $ACTION 
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
