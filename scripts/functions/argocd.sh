#!/bin/bash
  
wait_for_argocd_apps() {
  sleep 30  # ArgoCD Apps to bootstrap
  echo "Waiting for ArgoCD apps to be Healthy and Synced..."
  printed="$(mktemp)"

  while :; do
    done=true

    kubectl -n argocd get applications.argoproj.io -o json | jq -r '.items[] | [.metadata.name, .status.health.status, .status.sync.status] | @tsv' |
    while IFS="$(printf '\t')" read -r name health sync; do
      grep -Fxq "$name" "$printed" && continue

      if [ "$health" = "Healthy" ] && [ "$sync" = "Synced" ]; then
        echo "$name is Healthy and Synced"
        echo "$name" >> "$printed"
      else
        done=false
      fi
    done

    kubectl -n microservices get pods -l app=openframe-gateway || true
    kubectl -n microservices logs -l app=openframe-gateway -c openframe-gateway || true

    [ "$(wc -l < "$printed")" -eq "$(kubectl -n argocd get applications -o name | wc -l)" ] && break
    sleep 5
  done

  rm -f "$printed"
  echo "All ArgoCD apps are Healthy and Synced"
}