{{- define "app-helpers.redis" -}}
{{- $app := index . 1 -}}
{{- $vals := index . 2 -}}

{{/* Start with existing app values */}}
{{- $result := $app.values | default dict -}}

{{/* Only create redis config if docker password exists and is not empty */}}
{{- if ne ($vals.registry.docker.password | default "") "" -}}
  {{- $redis := $result.redis | default dict -}}
  {{- $_ := set $redis "imagePullSecrets" (list (dict "name" "docker-pat-secret")) -}}
  {{- $_ := set $result "redis" $redis -}}
{{- end -}}

{{- toYaml $result -}}
{{- end }}