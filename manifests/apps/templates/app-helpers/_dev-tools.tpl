{{- define "app-helpers.dev-tools.ignoreDifferences" -}}
- group: ""
  kind: ConfigMap
  name: traffic-manager
  namespace: platform
  jsonPointers:
  - /metadata/annotations/kubectl.kubernetes.io~1last-applied-configuration
  - /data/agent-state.yaml
{{- end }}
