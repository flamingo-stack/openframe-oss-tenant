{{- define "app-helpers.telepresence.ignoreDifferences" -}}
- group: ""
  kind: ConfigMap
  name: traffic-manager
  namespace: client-tools
  jsonPointers:
  - /metadata/annotations/kubectl.kubernetes.io~1last-applied-configuration
  - /data/agent-state.yaml
{{- end }}