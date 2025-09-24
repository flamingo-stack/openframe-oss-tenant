{{/*
Validate deployment configuration: exactly one deployment type must be enabled
*/}}
{{- define "chart.validateDeployment" -}}
{{- $oss := .Values.deployment.oss.enabled | default false -}}
{{- $saas := .Values.deployment.saas.enabled | default false -}}
{{- $deploymentCount := 0 -}}
{{- if $oss }}{{ $deploymentCount = add $deploymentCount 1 }}{{ end -}}
{{- if $saas }}{{ $deploymentCount = add $deploymentCount 1 }}{{ end -}}
{{- if ne $deploymentCount 1 -}}
{{- fail (printf "ERROR: Exactly one deployment type must be enabled. Currently oss=%t, saas=%t" $oss $saas) -}}
{{- end -}}
{{- end -}}

{{/*
Validate ingress configuration for the enabled deployment type
*/}}
{{- define "chart.validateIngress" -}}
{{- $oss := .Values.deployment.oss.enabled | default false -}}
{{- $saas := .Values.deployment.saas.enabled | default false -}}

{{- if $oss -}}
{{/* Self-hosted: exactly one ingress (localhost OR ngrok) must be enabled */}}
{{- $localhost := .Values.deployment.oss.ingress.localhost.enabled | default false -}}
{{- $ngrok := .Values.deployment.oss.ingress.ngrok.enabled | default false -}}
{{- $ingressCount := 0 -}}
{{- if $localhost }}{{ $ingressCount = add $ingressCount 1 }}{{ end -}}
{{- if $ngrok }}{{ $ingressCount = add $ingressCount 1 }}{{ end -}}
{{- if ne $ingressCount 1 -}}
{{- fail (printf "ERROR: Exactly one ingress must be enabled for oss deployment. Currently localhost=%t, ngrok=%t" $localhost $ngrok) -}}
{{- end -}}

{{- else if $saas -}}
{{/* SaaS: exactly one ingress (localhost OR gcp) must be enabled */}}
{{- $saasLocalhost := .Values.deployment.saas.ingress.localhost.enabled | default false -}}
{{- $saasGCP := .Values.deployment.saas.ingress.gcp.enabled | default false -}}
{{- $saasIngressCount := 0 -}}
{{- if $saasLocalhost }}{{ $saasIngressCount = add $saasIngressCount 1 }}{{ end -}}
{{- if $saasGCP }}{{ $saasIngressCount = add $saasIngressCount 1 }}{{ end -}}
{{- if ne $saasIngressCount 1 -}}
{{- fail (printf "ERROR: Exactly one ingress must be enabled for SaaS deployment. Currently localhost=%t, gcp=%t" $saasLocalhost $saasGCP) -}}
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