{{- define "app-helpers.grafana.ignoreDifferences" -}}
- group: apps
  kind: Deployment
  name: grafana
  namespace: platform
  jsonPointers:
    - /metadata/annotations/deployment.kubernetes.io~1revision
    - /spec/template/metadata/annotations/kubectl.kubernetes.io~1default-container
  jqPathExpressions:
    # silence env-from-resources normalization ('0' divisor)
    - .spec.template.spec.containers[]
      | select(.name=="grafana")
      | .env[]
      | select(.name=="GOMEMLIMIT")
      | .valueFrom.resourceFieldRef.divisor
    # ignore init image normalization (busybox/library/docker.io, etc.)
    - .spec.template.spec.initContainers[]
      | select(.name=="init-chown-data")
      | .image
    # (optional) ignore main container image normalization too
    - .spec.template.spec.containers[]
      | select(.name=="grafana")
      | .image
  managedFieldsManagers:
    - k3s
    - kube-controller-manager
{{- end }}