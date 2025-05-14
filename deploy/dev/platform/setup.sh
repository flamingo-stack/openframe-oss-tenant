#!/bin/bash

ARGOCD_VERSION="3.0.0"
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/v$ARGOCD_VERSION/manifests/install.yaml

# Step is necessary untill https://github.com/Flamingo-CX/openframe.git will be public
ARGOCD_PASSWORD=$(kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath={.data.password} | base64 -d)

kubectl run argocd-client -it --rm \
  --image=quay.io/argoproj/argocd:v3.0.0 \
  --namespace argocd \
  --restart=Never \
  --env ARGOCD_PASSWORD="$ARGOCD_PASSWORD" \
  --env GIT_PASSWORD="$GITHUB_TOKEN_CLASSIC"\
  -- sh

argocd login argocd-server.argocd.svc.cluster.local  --username=admin --password "$ARGOCD_PASSWORD" --insecure

argocd repo add https://github.com/Flamingo-CX/openframe.git --username "local_dev" --password "$GIT_PASSWORD"

kubectl -n argocd apply -f - <<EOF

    apiVersion: argoproj.io/v1alpha1
    kind: ApplicationSet
    metadata:
      name: argocd-apps
      finalizers:
        - resources-finalizer.argocd.argoproj.io
    spec:
      goTemplate: true
      generators:
      - list: 
          elements:
        
          # in-cluster apps
          - appName: platform
            path: deploy/dev/apps/platform/overlays/local
            branch: feature-restructure-platform
            syncWave: "-1"

      template:
        metadata:
          name: '{{.appName}}'
          annotations:
            argocd.argoproj.io/sync-wave: '{{.syncWave}}'
          finalizers:
            - resources-finalizer.argocd.argoproj.io

        spec:
          project: default

          source:
            repoURL: 'https://github.com/Flamingo-CX/{{or .repoName "openframe"}}.git' 
            targetRevision: '{{or .branch "main"}}'
            path: '{{.path}}'

          destination:
            name: '{{or .cluster "in-cluster"}}'
            namespace: '{{or .namespace "argocd"}}'

          syncPolicy:
            automated: 
              prune: true 
              selfHeal: true  
            retry:
              limit: -1  # unlimited
    
EOF
