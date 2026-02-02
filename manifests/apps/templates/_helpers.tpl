{{- define "app.allowlist" -}}
{{/* Defines the complete list of valid applications that can be deployed. */}}
cassandra debezium-connect grafana ingress-nginx kafka kafka-ui loki mongo-express mongodb zookeeper namespace-client-tools namespace-datasources namespace-integrated-tools namespace-microservices namespace-platform nats ngrok-operator openframe-api openframe-authorization-server openframe-client openframe-config openframe-external-api openframe-gateway openframe-management openframe-stream openframe-frontend pinot prometheus alloy redis telepresence postgres-authentik redis-authentik authentik mysql-fleetmdm redis-fleetmdm fleetmdm mongodb-meshcentral meshcentral postgres-tactical redis-tactical tactical-rmm registration
{{- end -}}

{{/*
app.skip

Returns "true" if the app should be skipped.

Usage:
  include "app.skip" (list $name $app $.Values)

Rules:
1. If not in allowlist → skip
2. If `enabled: false` → skip
3. If deployment.oss.enabled and ingress.localhost.enabled → skip "ngrok-operator"
4. If deployment.oss.enabled and ingress.ngrok.enabled → skip "ingress-nginx"
*/}}

{{- define "app.skip" -}}
{{- $name := index . 0 -}}
{{- $app := index . 1 -}}
{{- $vals := index . 2 -}}

{{/* Get the allowlist */}}
{{- $allowlist := include "app.allowlist" . | trim | splitList " " -}}

{{/* Skip if not in allowlist */}}
{{- if not (has $name $allowlist) }}
  true
{{/* Skip if explicitly disabled */}}
{{- else if and (hasKey $app "enabled") (eq $app.enabled false) }}
  true
{{- else }}

{{/* Extract deployment and ingress configuration */}}
{{- $ossLocalhost := $vals.deployment.oss.ingress.localhost.enabled | default false }}
{{- $ossNgrok := $vals.deployment.oss.ingress.ngrok.enabled | default false }}

{{/* Apply skipping logic */}}
{{- if and $ossLocalhost (eq $name "ngrok-operator") }}
  true
{{- else if and $ossNgrok (eq $name "ingress-nginx") }}
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
{{- $availableHelpers := list "ngrok-operator" -}}

{{- if has $name $availableHelpers -}}
  {{- $helper := printf "app-helpers.%s" $name -}}
  {{- include $helper (list $name $app $vals) -}}
{{- else if hasKey $app "values" -}}
  {{- toYaml (index $app "values") -}}
{{- end -}}
{{- end }}
