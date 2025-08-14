{{/*
app.skip

Returns "true" if the app should be skipped.

Usage:
  include "app.skip" (list $name $app $.Values)

Rules:
1. If `enabled: false` → skip
2. Otherwise:
   - If deployment.selfHosted is enabled:
     - If ingress is "ngrok" → skip "ingress-nginx"
     - If ingress is "localhost" → skip "ngrok-operator"
   - If deployment.saas is enabled:
     - Skip "openframe-authorization-server"
3. Everything else is included
*/}}

{{- define "app.skip" -}}

{{- $name := index . 0 -}}     {{/* app key name */}}
{{- $app := index . 1 -}}      {{/* app spec */}}
{{- $vals := index . 2 -}}     {{/* root .Values */}}

{{- $selfHosted := $vals.deployment.selfHosted.enabled | default false }}
{{- $saas := $vals.deployment.saas.enabled | default false }}
{{- $localhost := $vals.deployment.selfHosted.ingress.localhost.enabled | default false }}
{{- $ngrok := $vals.deployment.selfHosted.ingress.ngrok.enabled | default false }}
{{- $ingress := ternary "localhost" "ngrok" $localhost }}

{{/* ── Skip if explicitly disabled ── */}}
{{- if and (hasKey $app "enabled") (eq $app.enabled false) }}
  true

{{/* ── Skip authorization server for SaaS deployment ── */}}
{{- else if and $saas (eq $name "openframe-authorization-server") }}
  true

{{/* ── Skip based on ingress type for self-hosted ── */}}
{{- else if and $selfHosted (or
      (and (eq $ingress "ngrok") (eq $name "ingress-nginx"))
      (and (eq $ingress "localhost") (eq $name "ngrok-operator"))
    ) }}
  true

{{/* ── Default: do not skip ── */}}
{{- else }}
  false
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
