{{- define "app-helpers.pinot" -}}
{{- $app := index . 1 -}}
{{- $vals := index . 2 -}}

{{/* Start with existing app values */}}
{{- $result := $app.values | default dict -}}

{{/* Only create pinot config if docker password exists and is not empty */}}
{{- if ne ($vals.registry.docker.password | default "") "" -}}
  {{- $pinot := $result.pinot | default dict -}}
  {{- $_ := set $pinot "imagePullSecrets" (list (dict "name" "docker-pat-secret")) -}}
  {{- $_ := set $result "pinot" $pinot -}}
{{- end -}}

{{- if ne (len $result) 0 -}}
{{- toYaml $result -}}
{{- end -}}
{{- end }}