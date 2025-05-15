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

  kubectl run argocd-client -it --rm \
    --image=quay.io/argoproj/argocd:v$ARGOCD_VERSION \
    --namespace argocd \
    --restart=Never \
    --env ARGOCD_PASSWORD="$ARGOCD_PASSWORD" \
    --env GIT_PASSWORD="$GITHUB_TOKEN_CLASSIC" \
    -- sh -c '
      argocd login argocd-server.argocd.svc.cluster.local \
        --username admin --password "$ARGOCD_PASSWORD" --insecure && \
      argocd repo add https://github.com/Flamingo-CX/openframe.git \
        --username local_dev --password "$GIT_PASSWORD"
    '
}
