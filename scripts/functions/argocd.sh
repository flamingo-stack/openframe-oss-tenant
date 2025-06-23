#!/bin/bash


deploy_argocd() {
  echo "Deploying ArgoCD version $ARGOCD_VERSION..."
  kubectl create namespace argocd
  kubectl -n argocd apply -f https://raw.githubusercontent.com/argoproj/argo-cd/v$ARGOCD_VERSION/manifests/install.yaml

  echo "Waiting for ArgoCD to become ready..."
  for i in {1..100}; do
    kubectl -n argocd get pods -o json | jq -e '(.items|length>0) and ([.items[]|select(.status.phase=="Running")|.status.containerStatuses[]?|select(.ready)]|length)==([.items[]|.status.containerStatuses[]?]|length)' > /dev/null && return
    sleep 3
  done
  kubectl -n argocd get pods && exit 1
}


delete_argocd() {
  echo "Deleting ArgoCD version $ARGOCD_VERSION..."
  kubectl delete -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/v$ARGOCD_VERSION/manifests/install.yaml
  kubectl delete namespace argocd
}

  
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

    [ "$(wc -l < "$printed")" -eq "$(kubectl -n argocd get applications -o name | wc -l)" ] && break
    sleep 5
  done

  rm -f "$printed"
  echo "All ArgoCD apps are Healthy and Synced"
}


get_initial_secret() {
  kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
}
