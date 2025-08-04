{{/*
app.skip

Returns "true" if the app should be skipped.

Usage:
  include "app.skip" (list $name $app $.Values)

Rules:
1. If `enabled: false` → skip
2. Otherwise:
   - If deployment is "local":
     - If ingress is "ngrok" → skip "cert-manager", "ingress-nginx"
     - If ingress is "localhost"   → skip "ngrok-operator"
3. Everything else is included
*/}}

{{- define "app.skip" -}}

{{- $name := index . 0 -}}     {{/* app key name */}}
{{- $app := index . 1 -}}      {{/* app spec */}}
{{- $vals := index . 2 -}}     {{/* root .Values */}}

{{- $deployment := $vals.deployment.name | default "local" }}
{{- $localhost := $vals.deployment.ingress.localhost.enabled | default false }}
{{- $ngrok := $vals.deployment.ingress.ngrok.enabled | default false }}
{{- $ingress := ternary "localhost" "ngrok" $localhost }}

{{/* ── Validate deployment config ── */}}
{{- if not (or (eq $deployment "local") (eq $deployment "cloud")) }}
  {{- fail (printf "Invalid deployment.name: '%s'. Must be 'local' or 'cloud'." $deployment) }}
{{- end }}
{{- if and (eq $deployment "local") (not (or (eq $ingress "ngrok") (eq $ingress "localhost"))) }}
  {{- fail (printf "Invalid deployment.ingress: '%s'. Must be 'ngrok' or 'localhost' when deployment is 'local'." $ingress) }}
{{- end }}

{{/* ── Skip if explicitly disabled ── */}}
{{- if and (hasKey $app "enabled") (eq $app.enabled false) }}
  true

{{/* ── Skip based on ingress/deployment fallback ── */}}
{{- else if eq $deployment "local" }}
  {{- if or
        (and (eq $ingress "ngrok") (or (eq $name "cert-manager") (eq $name "ingress-nginx")))
        (and (eq $ingress "localhost")   (eq $name "ngrok-operator"))
      }}
    true
  {{- else }}
    false
  {{- end }}

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
