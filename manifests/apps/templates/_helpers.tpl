{{/*
app.skip

Returns "true" if the app should be skipped.

Usage:
  include "app.skip" (list $name $app $.Values)

Rules:
1. If `enabled: false` → skip
2. If deployment.oss.enabled and ingress.localhost.enabled → skip "ngrok-operator"
3. If deployment.oss.enabled and ingress.ngrok.enabled → skip "ingress-nginx"
4. If deployment.saas.enabled and ingress.localhost.enabled → skip "openframe-authorization-server" and "ngrok-operator"
*/}}

{{- define "app.skip" -}}
{{- $name := index . 0 -}}
{{- $app := index . 1 -}}
{{- $vals := index . 2 -}}

{{/* Skip if explicitly disabled */}}
{{- if and (hasKey $app "enabled") (eq $app.enabled false) }}
  true
{{- else }}

{{/* Extract deployment and ingress configuration */}}
{{- $oss := $vals.deployment.oss.enabled | default false }}
{{- $saas := $vals.deployment.saas.enabled | default false }}
{{- $ossLocalhost := $vals.deployment.oss.ingress.localhost.enabled | default false }}
{{- $ossNgrok := $vals.deployment.oss.ingress.ngrok.enabled | default false }}
{{- $saasLocalhost := $vals.deployment.saas.ingress.localhost.enabled | default false }}

{{/* Apply skipping logic */}}
{{- if and $oss $ossLocalhost (eq $name "ngrok-operator") }}
  true
{{- else if and $oss $ossNgrok (eq $name "ingress-nginx") }}
  true
{{- else if and $saas $saasLocalhost (or (eq $name "openframe-authorization-server") (eq $name "ngrok-operator")) }}
  true
{{- else }}
  false
{{- end }}

{{- end }}
{{- end }}

{{/*
app.values - Returns final values for an application, using helper if available

To add a new helper:
1. Create templates/app-helpers/_your-app.tpl
2. Add "your-app" to the list below
*/}}
{{- define "app.values" -}}
{{- $name := index . 0 -}}
{{- $app := index . 1 -}}
{{- $vals := index . 2 -}}

{{/* Apps with helpers - update this list when adding new helper files */}}
{{- $availableHelpers := list "ngrok-operator" "grafana" "kafka-ui" "prometheus" "loki" "promtail" "cert-manager" "cassandra" "redis" "kafka" "mongodb-exporter" "redis-exporter" -}}

{{- if has $name $availableHelpers -}}
  {{- $helper := printf "app-helpers.%s" $name -}}
  {{- include $helper (list $name $app $vals) -}}
{{- else if hasKey $app "values" -}}
  {{- toYaml (index $app "values") -}}
{{- end -}}
{{- end }}
