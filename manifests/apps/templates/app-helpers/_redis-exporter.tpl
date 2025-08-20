{{- define "app-helpers.redis-exporter" -}}
{{- $app := index . 1 -}}
{{- $vals := index . 2 -}}

{{/* Start with existing app values */}}
{{- $result := $app.values | default dict -}}

{{/* Only create prometheus-redis-exporter config if docker password exists and is not empty */}}
{{- if ne ($vals.registry.docker.password | default "") "" -}}
  {{- $redisexporter := index $result "prometheus-redis-exporter" | default dict -}}
  {{- $image := $redisexporter.image | default dict -}}
  {{- $_ := set $image "pullSecrets" (list "docker-pat-secret") -}}
  {{- $_ := set $redisexporter "image" $image -}}
  {{- $_ := set $result "prometheus-redis-exporter" $redisexporter -}}
{{- end -}}

{{- if ne (len $result) 0 -}}
{{- toYaml $result -}}
{{- end -}}
{{- end }}