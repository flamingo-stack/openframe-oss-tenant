{{/*
Validate that only one ingress is enabled
*/}}
{{- define "chart.validateIngress" -}}
{{- $localhost := .Values.deployment.ingress.localhost.enabled | default false -}}
{{- $ngrok := .Values.deployment.ingress.ngrok.enabled | default false -}}
{{- $count := 0 -}}
{{- if $localhost }}{{ $count = add $count 1 }}{{ end -}}
{{- if $ngrok }}{{ $count = add $count 1 }}{{ end -}}
{{- if ne $count 1 -}}
{{- fail (printf "ERROR: Exactly one ingress must be enabled. Currently localhost=%t, ngrok=%t" $localhost $ngrok) -}}
{{- end -}}
{{- end -}}
