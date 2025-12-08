{{- define "app.allowlist" -}}
{{/* Defines the complete list of valid applications that can be deployed. */}}
cassandra debezium-connect grafana ingress-nginx kafka kafka-ui loki mongo-express mongodb mongodb-exporter namespace-client-tools namespace-datasources namespace-integrated-tools namespace-microservices namespace-platform nats ngrok-operator openframe-api openframe-authorization-server openframe-client openframe-config openframe-external-api openframe-gateway openframe-management openframe-stream openframe-frontend pinot prometheus promtail redis telepresence authentik fleetmdm meshcentral tactical-rmm registration
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
5. If deployment.saas.enabled → skip "all that are at saas" "pinot" "openframe-gateway" "openframe-external-api" "openframe-stream" "openframe-config" "openframe-client" "openframe-api" "openframe-authorization-server" "ngrok-operator" "registration"
6. If deployment.saas.enabled and ingress.gcp.enabled → skip "ingress-nginx"
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
{{- else if and $saas (or (eq $name "cassandra") (eq $name "debezium-connect") (eq $name "grafana") (eq $name "kafka") (eq $name "kafka-ui") (eq $name "loki") (eq $name "mongo-express") (eq $name "mongodb") (eq $name "mongodb-exporter") (eq $name "namespace-client-tools") (eq $name "namespace-datasources") (eq $name "namespace-integrated-tools") (eq $name "namespace-microservices") (eq $name "namespace-platform") (eq $name "nats") (eq $name "ngrok-operator") (eq $name "openframe-api") (eq $name "openframe-authorization-server") (eq $name "openframe-client") (eq $name "openframe-config") (eq $name "openframe-external-api") (eq $name "openframe-gateway") (eq $name "openframe-stream") (eq $name "openframe-management") (eq $name "pinot") (eq $name "prometheus") (eq $name "promtail") (eq $name "redis") (eq $name "telepresence") (eq $name "authentik") (eq $name "fleetmdm") (eq $name "meshcentral") (eq $name "tactical-rmm") (eq $name "registration")) }}
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
{{- $availableHelpers := list "mongodb-exporter" "ngrok-operator" -}}

{{- if has $name $availableHelpers -}}
  {{- $helper := printf "app-helpers.%s" $name -}}
  {{- include $helper (list $name $app $vals) -}}
{{- else if hasKey $app "values" -}}
  {{- toYaml (index $app "values") -}}
{{- end -}}
{{- end }}
