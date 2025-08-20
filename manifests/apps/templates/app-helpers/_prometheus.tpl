{{- define "app-helpers.prometheus" -}}
{{- $app := index . 1 -}}
{{- $vals := index . 2 -}}

{{/* Start with existing app values */}}
{{- $result := $app.values | default dict -}}

{{/* Only create prometheus config if docker password exists and is not empty */}}
{{- if ne ($vals.registry.docker.password | default "") "" -}}
  {{- $prometheus := index $result "kube-prometheus-stack" | default dict -}}
  {{- $global := $prometheus.global | default dict -}}
  {{- $_ := set $global "imagePullSecrets" (list (dict "name" "docker-pat-secret")) -}}
  {{- $_ := set $prometheus "global" $global -}}
  {{- $_ := set $result "kube-prometheus-stack" $prometheus -}}
{{- end -}}

{{- toYaml $result -}}
{{- end }}