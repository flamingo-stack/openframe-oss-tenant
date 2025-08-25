{{- define "app-helpers.promtail" -}}
{{- $app := index . 1 -}}
{{- $vals := index . 2 -}}

{{/* Start with existing app values */}}
{{- $result := $app.values | default dict -}}

{{/* Only create promtail config if docker password exists and is not empty */}}
{{- if ne ($vals.registry.docker.password | default "") "" -}}
  {{- $promtail := $result.promtail | default dict -}}
  {{- $global := $promtail.global | default dict -}}
  {{- $_ := set $global "imagePullSecrets" (list (dict "name" "docker-pat-secret")) -}}
  {{- $_ := set $promtail "global" $global -}}
  {{- $_ := set $result "promtail" $promtail -}}
{{- end -}}

{{- if ne (len $result) 0 -}}
{{- toYaml $result -}}
{{- end -}}
{{- end }}