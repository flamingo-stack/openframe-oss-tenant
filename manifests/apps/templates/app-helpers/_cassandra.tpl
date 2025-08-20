{{- define "app-helpers.cassandra" -}}
{{- $app := index . 1 -}}
{{- $vals := index . 2 -}}

{{/* Start with existing app values */}}
{{- $result := $app.values | default dict -}}

{{/* Only create cassandra config if docker password exists and is not empty */}}
{{- if ne ($vals.registry.docker.password | default "") "" -}}
  {{- $cassandra := $result.cassandra | default dict -}}
  {{- $_ := set $cassandra "imagePullSecrets" (list (dict "name" "docker-pat-secret")) -}}
  {{- $_ := set $result "cassandra" $cassandra -}}
{{- end -}}

{{- toYaml $result -}}
{{- end }}