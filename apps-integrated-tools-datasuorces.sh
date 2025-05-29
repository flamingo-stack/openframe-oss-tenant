# MESHCENTRAL
function integrated_tools_datasources_meshcentral_deploy() {

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
