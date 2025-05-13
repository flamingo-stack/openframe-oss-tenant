kubectl create namespace argocd && 
  kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/v2.6.4/manifests/install.yaml

kubectl -n argocd apply -f - <<EOF

    apiVersion: argoproj.io/v1alpha1
    kind: ApplicationSet
    metadata:
      name: argocd-apps
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