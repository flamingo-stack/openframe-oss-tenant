# MESHCENTRAL
function integrated_tools_datasources_meshcentral_deploy() {
  echo "Deploying MeshCentral Datasources" &&
    kubectl -n integrated-tools-datasources apply -k ${ROOT_REPO_DIR}/manifests/integrated-tools-datasources/meshcentral
  echo "Applying MongoDB StatefulSet and Service..." &&
  kubectl apply -f ${ROOT_REPO_DIR}/manifests/integrated-tools-datasources/meshcentral/base/mongodb.yaml &&
  echo "Waiting for MongoDB pods to be ready..." &&
  kubectl wait --for=condition=ready pod -n integrated-tools-datasources -l app=meshcentral-mongodb --timeout=600s &&

  echo "Applying replica set initialization job..." &&
  kubectl apply -f ${ROOT_REPO_DIR}/manifests/integrated-tools-datasources/meshcentral/base/mongodb-init-replicaset.yaml &&
  echo "Waiting for initialization job to complete..." &&
  kubectl wait --for=condition=complete job/mongodb-init-replicaset -n integrated-tools-datasources --timeout=600s &&

  echo "Enabling authentication..." &&
  kubectl patch statefulset meshcentral-mongodb -n integrated-tools-datasources --type='json' -p='[
    {"op": "add", "path": "/spec/template/spec/containers/0/args/-", "value": "--auth"},
    {"op": "add", "path": "/spec/template/spec/containers/0/args/-", "value": "--keyFile=/data/key/internal-auth.key"}
  ]' &&

  echo "Waiting for MongoDB pods to restart with authentication..." &&
  kubectl rollout restart statefulset/meshcentral-mongodb -n integrated-tools-datasources &&
  kubectl rollout status statefulset/meshcentral-mongodb -n integrated-tools-datasources --timeout=600s &&

  check_deployment
}

function integrated_tools_datasources_meshcentral_wait() {
@@ -62,8 +82,16 @@ function integrated_tools_datasources_meshcentral_wait() {
}

function integrated_tools_datasources_meshcentral_delete() {
  echo "Deleting MeshCentral Datasources" &&
    kubectl -n integrated-tools-datasources delete -k ${ROOT_REPO_DIR}/manifests/integrated-tools-datasources/meshcentral
  echo "Deleting MeshCentral Datasources..." &&
    echo "Cleaning up MongoDB resources..." &&
    kubectl -n integrated-tools-datasources delete job mongodb-init-replicaset --ignore-not-found &&
    kubectl -n integrated-tools-datasources delete statefulset meshcentral-mongodb --ignore-not-found &&
    kubectl -n integrated-tools-datasources delete service meshcentral-mongodb --ignore-not-found &&
    kubectl -n integrated-tools-datasources delete secret mongodb-keyfile --ignore-not-found &&

    # Wait for pods to be terminated
    echo "Waiting for MongoDB pods to terminate..." &&
    kubectl -n integrated-tools-datasources wait --for=delete pod -l app=meshcentral-mongodb --timeout=120s 2>/dev/null || true
}