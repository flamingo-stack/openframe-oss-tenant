{{- define "app-helpers.cert-manager" -}}
{{- $app := index . 1 -}}
{{- $vals := index . 2 -}}

{{/* Start with existing app values */}}
{{- $result := $app.values | default dict -}}

{{/* Only create cert-manager config if docker password exists and is not empty */}}
{{- if ne ($vals.registry.docker.password | default "") "" -}}
  {{- $certmanager := index $result "cert-manager" | default dict -}}
  {{- $global := $certmanager.global | default dict -}}
  {{- $_ := set $global "imagePullSecrets" (list (dict "name" "docker-pat-secret")) -}}
  {{- $_ := set $certmanager "global" $global -}}
  {{- $_ := set $result "cert-manager" $certmanager -}}
{{- end -}}

{{- toYaml $result -}}
{{- end }}