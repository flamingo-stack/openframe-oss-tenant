{{- define "app-helpers.kafka-ui" -}}
{{- $app := index . 1 -}}
{{- $vals := index . 2 -}}

{{/* Start with existing app values */}}
{{- $result := $app.values | default dict -}}

{{/* Only create kafka-ui config if docker password exists and is not empty */}}
{{- if ne ($vals.registry.docker.password | default "") "" -}}
  {{- $kafkaui := index $result "kafka-ui" | default dict -}}
  {{- $_ := set $kafkaui "imagePullSecrets" (list (dict "name" "docker-pat-secret")) -}}
  {{- $_ := set $result "kafka-ui" $kafkaui -}}
{{- end -}}

{{- if ne (len $result) 0 -}}
{{- toYaml $result -}}
{{- end -}}
{{- end }}