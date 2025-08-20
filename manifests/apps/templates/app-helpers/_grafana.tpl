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

{{- toYaml $result -}}
{{- end }}