{{- define "app-helpers.grafana" -}}
{{- $app := index . 1 -}}
{{- $vals := index . 2 -}}

{{/* Start with existing app values */}}
{{- $result := $app.values | default dict -}}

{{/* Only create grafana config if docker password exists and is not empty */}}
{{- if ne ($vals.registry.docker.password | default "") "" -}}
  {{- $grafana := $result.grafana | default dict -}}
  {{- $global := $grafana.global | default dict -}}
  {{- $_ := set $global "imagePullSecrets" (list (dict "name" "docker-pat-secret")) -}}
  {{- $_ := set $grafana "global" $global -}}
  {{- $_ := set $result "grafana" $grafana -}}
{{- end -}}

{{- if ne (len $result) 0 -}}
{{- toYaml $result -}}
{{- end -}}
{{- end }}


{{- define "app-helpers.grafana.ignoreDifferences" -}}
- group: apps
  kind: Deployment
  name: grafana
  namespace: platform
  # keep: revision + default-container annotations
  jsonPointers:
    - /metadata/annotations/deployment.kubernetes.io~1revision
    - /spec/template/metadata/annotations/kubectl.kubernetes.io~1default-container
  # tighten: ignore ONLY the init image normalization (not the main container)
  jqPathExpressions:
    - .spec.template.spec.initContainers[]
      | select(.name=="init-chown-data")
      | .image
  # rely on managedFields to suppress controller-written noise
  managedFieldsManagers:
    - k3s
    - kube-controller-manager
{{- end }}