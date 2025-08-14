{{/*
Validate deployment configuration: exactly one deployment type must be enabled
*/}}
{{- define "chart.validateDeployment" -}}
{{- $selfHosted := .Values.deployment.selfHosted.enabled | default false -}}
{{- $saas := .Values.deployment.saas.enabled | default false -}}
{{- $deploymentCount := 0 -}}
{{- if $selfHosted }}{{ $deploymentCount = add $deploymentCount 1 }}{{ end -}}
{{- if $saas }}{{ $deploymentCount = add $deploymentCount 1 }}{{ end -}}
{{- if ne $deploymentCount 1 -}}
{{- fail (printf "ERROR: Exactly one deployment type must be enabled. Currently selfHosted=%t, saas=%t" $selfHosted $saas) -}}
{{- end -}}
{{- end -}}

{{/*
Validate that only one ingress is enabled (only when selfHosted is enabled)
*/}}
{{- define "chart.validateIngress" -}}
{{- $selfHosted := .Values.deployment.selfHosted.enabled | default false -}}
{{- if $selfHosted -}}
{{- $localhost := .Values.deployment.selfHosted.ingress.localhost.enabled | default false -}}
{{- $ngrok := .Values.deployment.selfHosted.ingress.ngrok.enabled | default false -}}
{{- $ingressCount := 0 -}}
{{- if $localhost }}{{ $ingressCount = add $ingressCount 1 }}{{ end -}}
{{- if $ngrok }}{{ $ingressCount = add $ingressCount 1 }}{{ end -}}
{{- if ne $ingressCount 1 -}}
{{- fail (printf "ERROR: Exactly one ingress must be enabled when selfHosted is true. Currently localhost=%t, ngrok=%t" $localhost $ngrok) -}}
{{- end -}}
{{- end -}}
{{- end -}}

{{/*
Complete validation: validates both deployment and ingress configuration
*/}}
{{- define "chart.validate" -}}
{{- include "chart.validateDeployment" . -}}
{{- include "chart.validateIngress" . -}}
{{- end -}}
