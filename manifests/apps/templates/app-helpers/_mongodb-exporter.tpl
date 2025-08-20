{{- define "app-helpers.mongodb-exporter" -}}
{{- $app := index . 1 -}}
{{- $vals := index . 2 -}}

{{/* Start with existing app values */}}
{{- $result := $app.values | default dict -}}

{{/* Only create mongodb-exporter config if docker password exists and is not empty */}}
{{- if ne ($vals.registry.docker.password | default "") "" -}}
  {{- $mongodbexporter := index $result "mongodb-exporter" | default dict -}}
  {{- $_ := set $mongodbexporter "imagePullSecrets" (list (dict "name" "docker-pat-secret")) -}}
  {{- $_ := set $result "mongodb-exporter" $mongodbexporter -}}
{{- end -}}

{{- toYaml $result -}}
{{- end }}