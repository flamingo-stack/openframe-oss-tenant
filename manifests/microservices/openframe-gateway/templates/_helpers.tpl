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

{{/*
Validate TLS certificate format and structure
*/}}
{{- define "chart.localhost.hasTLS" -}}
{{- $tls := .Values.deployment.ingress.localhost.tls | default "" -}}
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
