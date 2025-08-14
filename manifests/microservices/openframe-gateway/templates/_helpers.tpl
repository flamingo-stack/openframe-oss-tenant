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

{{/*
Validate TLS certificate format and structure
*/}}
{{- define "chart.localhost.hasTLS" -}}
{{- $tls := .Values.deployment.selfHosted.ingress.localhost.tls | default "" -}}
{{- if and $tls $tls.cert $tls.key -}}
{{- $cert := $tls.cert | toString | trim -}}
{{- $key := $tls.key | toString | trim -}}
{{/* Validate certificate structure */}}
{{- if and (hasPrefix "-----BEGIN CERTIFICATE-----" $cert) (hasSuffix "-----END CERTIFICATE-----" $cert) -}}
{{/* Validate private key structure - support PKCS#8, RSA, and EC keys */}}
{{- if or (and (hasPrefix "-----BEGIN PRIVATE KEY-----" $key) (hasSuffix "-----END PRIVATE KEY-----" $key)) (and (hasPrefix "-----BEGIN RSA PRIVATE KEY-----" $key) (hasSuffix "-----END RSA PRIVATE KEY-----" $key)) (and (hasPrefix "-----BEGIN EC PRIVATE KEY-----" $key) (hasSuffix "-----END EC PRIVATE KEY-----" $key)) -}}
{{/* Ensure minimum content length (more than just headers) */}}
{{- if and (gt (len $cert) 100) (gt (len $key) 100) -}}
true
{{- else -}}
{{- printf "WARNING: Certificate or key content is too short\n" | print -}}
false
{{- end -}}
{{- else -}}
{{- printf "WARNING: Private key must be in PKCS#8, RSA, or EC format with proper PEM headers\n" | print -}}
false
{{- end -}}
{{- else -}}
{{- printf "WARNING: Certificate must be in PEM format with proper headers\n" | print -}}
false
{{- end -}}
{{- end -}}
{{- end -}}
