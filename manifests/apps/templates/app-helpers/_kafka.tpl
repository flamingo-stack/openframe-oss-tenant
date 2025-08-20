{{- define "app-helpers.kafka" -}}
{{- $app := index . 1 -}}
{{- $vals := index . 2 -}}

{{/* Start with existing app values */}}
{{- $result := $app.values | default dict -}}

{{/* Only create kafka config if docker password exists and is not empty */}}
{{- if ne ($vals.registry.docker.password | default "") "" -}}
  {{- $kafka := $result.kafka | default dict -}}
  {{- $global := $kafka.global | default dict -}}
  {{- $_ := set $global "imagePullSecrets" (list (dict "name" "docker-pat-secret")) -}}
  {{- $_ := set $kafka "global" $global -}}
  {{- $_ := set $result "kafka" $kafka -}}
{{- end -}}

{{- toYaml $result -}}
{{- end }}