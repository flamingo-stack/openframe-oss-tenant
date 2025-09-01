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