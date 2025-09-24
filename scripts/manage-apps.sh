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
    
    helm repo add argo https://argoproj.github.io/argo-helm > "${DEPLOY_LOG_DIR}/deploy-argocd.log"
    helm repo update >> "${DEPLOY_LOG_DIR}/deploy-argocd.log"
    helm upgrade --install argo-cd argo/argo-cd \
      --version=8.1.4 \
      --namespace argocd \
      --create-namespace \
      --wait \
      --timeout 5m \
      -f "${ROOT_REPO_DIR}/manifests/argocd-values.yaml" >> "${DEPLOY_LOG_DIR}/deploy-argocd.log"

    stop_spinner_and_return_code $? || exit 1 
  elif [ "$ACTION" == "delete" ]; then
    helm -n argocd delete argo-cd
  fi
  ;;
argocd_apps)
  if [ "$ACTION" == "deploy" ]; then 
    start_spinner "Deploying ArgoCD Apps"

    helm upgrade --install app-of-apps "${ROOT_REPO_DIR}/manifests/app-of-apps" \
      --namespace argocd \
      --wait \
      --timeout 60m \
      -f "${SCRIPT_DIR}/helm-values.yaml" \
      --set-file deployment.oss.ingress.localhost.tls.cert=${CERT_DIR}/localhost.pem \
      --set-file deployment.oss.ingress.localhost.tls.key=${CERT_DIR}/localhost-key.pem 
      # \
      # > "${DEPLOY_LOG_DIR}/deploy-app-of-apps.log" 2> >(grep -v 'metadata\.finalizers' >&2)
    wait_for_argocd_apps 
    # >> "${DEPLOY_LOG_DIR}/deploy-app-of-apps.log"    

    stop_spinner_and_return_code $? || exit 1 
    
  elif [ "$ACTION" == "delete" ]; then
    helm -n argocd delete app-of-apps
  elif [ "$ACTION" == "dev" ]; then
    echo "$APP is not supported in dev mode"
    exit 0
  fi
  ;;
certificates)
  if [ "$ACTION" == "deploy" ]; then
    start_spinner "Creating localhost certificates"
    create_certificates > "${DEPLOY_LOG_DIR}/certificates.log" 2>&1
    stop_spinner_and_return_code $? || exit 1
  elif [ "$ACTION" == "delete" ]; then
    delete_certificates
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
  fi
  ;;
# BUNDLE APPS
a | all)
  ACTION=${2}
  $0 certificates $ACTION && 
    $0 argocd $ACTION &&
    $0 argocd_apps $ACTION 
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
