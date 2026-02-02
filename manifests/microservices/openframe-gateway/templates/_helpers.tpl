{{/*
Get TLS configuration for localhost ingress
Returns the TLS object (cert and key)
*/}}
{{- define "chart.localhost.tls" -}}
{{- toYaml .Values.deployment.oss.ingress.localhost.tls -}}
{{- end -}}

{{/*
Validate TLS certificate format and structure
*/}}
{{- define "chart.localhost.hasTLS" -}}
{{- $tls := .Values.deployment.oss.ingress.localhost.tls | default "" -}}
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
{{- end -}}
{{- end -}}
{{- end -}}
{{- end -}}
{{- end -}}
