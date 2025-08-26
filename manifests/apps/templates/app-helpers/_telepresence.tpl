{{- define "app-helpers.telepresence.ignoreDifferences" -}}
- group: ""
  kind: ConfigMap
  name: traffic-manager
  namespace: client-tools
{{- end }}