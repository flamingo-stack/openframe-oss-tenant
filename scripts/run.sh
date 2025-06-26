#!/bin/bash

# Get the directory where the script is located
# Add environment variable to detect recursive calls
if [ -z "$OPENFRAME_RECURSIVE_CALL" ]; then
  export OPENFRAME_RECURSIVE_CALL=0
fi

export SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
export ROOT_REPO_DIR="${SCRIPT_DIR}/.."

# Convert Windows paths to Git Bash paths if running on Windows
if [[ "$OS" == *"NT"* ]] || [[ "$OS" == "MINGW"* ]] || [[ "$OS" == "CYGWIN"* ]]; then
  # Convert Windows path to Git Bash path
  export SCRIPT_DIR=$(echo "$SCRIPT_DIR" | sed 's/\\/\//g' | sed 's/^\([A-Za-z]\):/\/\1/')
  export ROOT_REPO_DIR=$(echo "$ROOT_REPO_DIR" | sed 's/\\/\//g' | sed 's/^\([A-Za-z]\):/\/\1/')
fi

# Source functions in correct order
source "${SCRIPT_DIR}/functions/variables.sh"

source "${SCRIPT_DIR}/functions/spinner.sh"
while IFS= read -r func; do
  [[ "$func" == _spin* || "$func" == *spinner* ]] && export -f "$func"
done < <(declare -F | awk '{print $3}')

source "${SCRIPT_DIR}/functions/flamingo.sh"
export -f flamingo

source "${SCRIPT_DIR}/functions/show-help.sh"
export -f show_help

source "${SCRIPT_DIR}/functions/add_loopback_ip.sh"
export -f add_loopback_ip

source "${SCRIPT_DIR}/functions/wait.sh"
export -f wait_for_app

source "${SCRIPT_DIR}/functions/develop.sh"
export -f intercept_app switch_argocd_app_health

source "${SCRIPT_DIR}/functions/argocd.sh"
export -f deploy_argocd delete_argocd wait_for_argocd_apps get_initial_secret

# Source remaining functions
for s in "${SCRIPT_DIR}/functions/apps-"*.sh; do
  if [ -f "$s" ]; then
    source "$s"
    # Export all functions from the sourced file
    while IFS= read -r func; do
      export -f "$func"
    done < <(declare -F | awk '{print $3}')
  fi
done

# Display OpenFrame logo and initialize spinners only on first call
if [ "$OPENFRAME_RECURSIVE_CALL" -eq 0 ]; then
  flamingo

  trap 'stop_spinner 1' SIGINT SIGTERM

  # Create log directory if it doesn't exist
  if [ -d "${DEPLOY_LOG_DIR}" ]; then
    rm -rf "${DEPLOY_LOG_DIR}"
  fi
  if [ "$1" != "" ]; then
    start_spinner "Create log directory for deployment (${DEPLOY_LOG_DIR})"
    mkdir -p "${DEPLOY_LOG_DIR}"
    stop_spinner_and_return_code $? || exit 1
  fi
fi

ARG=$1
NAMESPACE=$2
APP=$3
ACTION=$4

if [ "$ACTION" == "intercept" ] || [ "$ACTION" == "health" ]; then
  ARG1="$5"
  ARG2="$6"
fi

case "$ARG" in
  k|cluster)
    if k3d cluster list 2>/dev/null | awk '{print $1}' | grep -q "^$K3D_CLUSTER_NAME$"; then
      start_spinner "Using existing '$K3D_CLUSTER_NAME' cluster."
      stop_spinner_and_return_code $? || exit 1
    else
      start_spinner "Setting up cluster"
      setup_cluster > "${DEPLOY_LOG_DIR}/setup-cluster.log" 2>&1
      stop_spinner_and_return_code $? || exit 1
    fi
    ;;
  d|delete)
    start_spinner "Deleting cluster"
    telepresence quit > "${DEPLOY_LOG_DIR}/telepresence-quit.log" 2>&1 && \
    k3d cluster delete $K3D_CLUSTER_NAME --all > "${DEPLOY_LOG_DIR}/k3d-cluster-delete.log" 2>&1
    docker network prune -f > "${DEPLOY_LOG_DIR}/network-prune.log" 2>&1
    stop_spinner_and_return_code $? || exit 1
    ;;
  a|app)
    # Deploy app one by one
    if [ -n "$APP" ]; then
      bash "${SCRIPT_DIR}/manage-apps.sh" app "$NAMESPACE" "$APP" "$ACTION" "$ARG1" "$ARG2"
    else
      bash "${SCRIPT_DIR}/manage-apps.sh" "''"
    fi
    ;;
  b|bootstrap)
    # Bootstrap whole cluster with all apps
    OPENFRAME_RECURSIVE_CALL=1 bash "$0" cluster && \
    bash "${SCRIPT_DIR}/manage-apps.sh" all deploy
    ;;
  c|cleanup)
    for node in k3d-openframe-dev-agent-0 k3d-openframe-dev-agent-1 k3d-openframe-dev-agent-2 k3d-openframe-dev-server-0; do
      echo "Cleaning up $node ..." 
      docker exec "$node" crictl rmi --prune
    done
    ;;
  s|start)
    start_spinner "Starting cluster"
    add_loopback_ip > "${DEPLOY_LOG_DIR}/cluster-start.log" 2>&1 && \
    k3d cluster start $K3D_CLUSTER_NAME > "${DEPLOY_LOG_DIR}/cluster-start.log" 2>&1 && \
    stop_spinner_and_return_code $? || exit 1
    ;;
  stop)
    start_spinner "Stopping cluster"
    telepresence quit > "${DEPLOY_LOG_DIR}/cluster-stop.log" 2>&1 && \
    k3d cluster stop $K3D_CLUSTER_NAME > "${DEPLOY_LOG_DIR}/cluster-stop.log" 2>&1
    stop_spinner_and_return_code $? || exit 1
    ;;
  -h|--help|-Help|help)
    show_help
    exit 0
    ;;
  *)
    show_help
    exit 0
esac
