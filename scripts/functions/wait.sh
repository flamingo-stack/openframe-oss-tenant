function wait_for_app() {
  local NAMESPACE=$1
  local LABEL=$2

  kubectl -n $NAMESPACE wait --for=condition=Ready pod -l $LABEL --timeout=20m
}