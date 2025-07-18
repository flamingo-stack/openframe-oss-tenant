#!/bin/bash
  
wait_for_argocd_apps() {
  local namespace="argocd"
  local app="argocd-apps"
  local timeout=${ARGOCD_TIMEOUT:-1500}  # 25 minutes to match Helm timeout, configurable via ARGOCD_TIMEOUT env var
  local interval=5
  local elapsed=0

  while (( elapsed < timeout )); do
    status=$(kubectl -n "$namespace" get application "$app" -o json 2>/dev/null)

    if [[ -n "$status" ]]; then
      health=$(jq -r '.status.health.status // ""' <<< "$status")
      sync=$(jq -r '.status.sync.status // ""' <<< "$status")

      if [[ "$health" == "Healthy" && "$sync" == "Synced" ]]; then
        echo "Application '$app' is Healthy and Synced"
        return 0
      fi
    fi

    sleep "$interval"
    (( elapsed += interval ))
  done

  echo "Timeout: Application '$app' did not become Healthy and Synced within $timeout seconds."
  kubectl -n "$namespace" get application "$app" -o yaml || true
  return 1
}

