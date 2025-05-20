#!/bin/bash


function deploy_argocd() {
  echo "Deploying ArgoCD version $ARGOCD_VERSION..."
  kubectl create namespace argocd
  kubectl -n argocd apply -f https://raw.githubusercontent.com/argoproj/argo-cd/v$ARGOCD_VERSION/manifests/install.yaml

  echo "Waiting for ArgoCD server to become ready..."
  kubectl -n argocd wait --for=condition=Ready pods --all --timeout=300s
}


function delete_argocd() {
  echo "Deleting ArgoCD version $ARGOCD_VERSION..."
  kubectl delete -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/v$ARGOCD_VERSION/manifests/install.yaml
  kubectl delete namespace argocd
}


# Function is necessary untill https://github.com/Flamingo-CX/openframe.git will be public
function argocd_client() {
  echo "Adding Openframe private repo to ArgoCD..."
  ARGOCD_PASSWORD=$(kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath={.data.password} | base64 -d)

  kubectl run argocd-client --attach --rm \
    --image=quay.io/argoproj/argocd:v$ARGOCD_VERSION \
    --namespace argocd \
    --restart=Never \
    --env ARGOCD_PASSWORD="$ARGOCD_PASSWORD" \
    --env GIT_PASSWORD="$GITHUB_TOKEN_CLASSIC" \
    --command -- sh -c '
      argocd login argocd-server.argocd.svc.cluster.local \
        --username admin --password "$ARGOCD_PASSWORD" --insecure && \
      argocd repo add https://github.com/Flamingo-CX/openframe.git \
        --username local_dev --password "$GIT_PASSWORD"
    '
}

  
wait_for_argocd_apps() {
  sleep 30  # Platform App to bootstrap
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
    sleep 3
  done

  rm -f "$printed"
  echo "All ArgoCD apps are Healthy and Synced"
}
