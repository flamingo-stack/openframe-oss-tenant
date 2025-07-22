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

{{- $deployment := get $vals.deployment "name" | default "local" }}
{{- $ingress := get $vals.deployment "ingress" | default "ngrok" }}

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
