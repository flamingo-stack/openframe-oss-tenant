{{- define "app.allowlist" -}}
{{/* Defines the complete list of valid applications that can be deployed. */}}
cassandra debezium-connect grafana ingress-nginx kafka kafka-ui loki mongo-express mongodb mongodb-exporter namespace-client-tools namespace-datasources namespace-integrated-tools namespace-microservices namespace-platform nats ngrok-operator openframe-api openframe-authorization-server openframe-client openframe-config openframe-external-api openframe-gateway openframe-management openframe-stream openframe-frontend pinot prometheus promtail redis redis-exporter telepresence zookeeper authentik fleetmdm meshcentral tactical-rmm
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
5. If deployment.saas.enabled → skip "openframe-api" 
6. If deployment.saas.enabled and ingress.localhost.enabled → skip "openframe-authorization-server" and "ngrok-operator"
7. If deployment.saas.enabled and ingress.gcp.enabled → skip "ingress-nginx"
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
{{- $oss := $vals.deployment.oss.enabled | default false }}
{{- $ossLocalhost := $vals.deployment.oss.ingress.localhost.enabled | default false }}
{{- $ossNgrok := $vals.deployment.oss.ingress.ngrok.enabled | default false }}
{{- $saas := $vals.deployment.saas.enabled | default false }}
{{- $saasLocalhost := $vals.deployment.saas.ingress.localhost.enabled | default false }}
{{- $saasGcp := $vals.deployment.saas.ingress.gcp.enabled | default false }}

{{/* Apply skipping logic */}}
{{- if and $oss $ossLocalhost (eq $name "ngrok-operator") }}
  true
{{- else if and $oss $ossNgrok (eq $name "ingress-nginx") }}
  true
{{- else if and $saas (eq $name "openframe-api") }}
  true
{{- else if and $saas $saasLocalhost (or (eq $name "openframe-authorization-server") (eq $name "ngrok-operator")) }}
  true
{{- else if and $saas $saasGcp (eq $name "ingress-nginx") }}
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
{{- $availableHelpers := list "cassandra" "grafana" "kafka" "kafka-ui" "loki" "mongodb-exporter" "ngrok-operator" "prometheus" "promtail" "redis" "redis-exporter" -}}

{{- if has $name $availableHelpers -}}
  {{- $helper := printf "app-helpers.%s" $name -}}
  {{- include $helper (list $name $app $vals) -}}
{{- else if hasKey $app "values" -}}
  {{- toYaml (index $app "values") -}}
{{- end -}}
{{- end }}
