{{/*
openframe.shouldSkipApp

Returns "true" if the app should be skipped based on:
1. enabled: true → always include
2. enabled: false → always skip
3. fallback to deployment+ingress logic

Arguments:
- $app      = the app map
- $category = the parent category (e.g. platform)
- $vals     = the full .Values tree
*/}}
{{- define "openframe.shouldSkipApp" -}}

{{- $app := index . 0 -}}
{{- $category := index . 1 -}}
{{- $vals := index . 2 -}}

{{- $appName := $app.name | quote }}
{{- $deployment := default "local" (get $vals.deployment "name") }}
{{- $ingress := default "ngrok" (get $vals.deployment "ingress") }}

{{/* ────── Validate deployment config ────── */}}
{{- if not (or (eq $deployment "local") (eq $deployment "cloud")) }}
  {{- fail (printf "Invalid deployment.name: '%s'. Must be 'local' or 'cloud'." $deployment) }}
{{- end }}
{{- if and (eq $deployment "local") (not (or (eq $ingress "ngrok") (eq $ingress "nat"))) }}
  {{- fail (printf "Invalid deployment.ingress: '%s'. Must be 'ngrok' or 'nat' when deployment is 'local'." $ingress) }}
{{- end }}

{{/* ────── Apply enabled/disabled overrides ────── */}}
{{- $appEnabled := get $app "enabled" }}
{{- $catEnabled := get $category "enabled" }}

{{- if and (typeIs "bool" $appEnabled) (eq $appEnabled true) }}
  false
{{- else if and (typeIs "bool" $appEnabled) (eq $appEnabled false) }}
  true
{{- else if and (typeIs "bool" $catEnabled) (eq $catEnabled true) }}
  false
{{- else if and (typeIs "bool" $catEnabled) (eq $catEnabled false) }}
  true

{{/* ────── Fallback logic based on deployment + ingress ────── */}}
{{- else if eq $deployment "local" }}
  {{- if or
        (and (eq $ingress "ngrok") (or (eq $app.name "ingress-nginx") (eq $app.name "cert-manager")))
        (and (eq $ingress "nat")   (eq $app.name "ngrok-operator"))
      }}
    true
  {{- else }}
    false
  {{- end }}
{{- else }}
  false
{{- end }}

{{- end }}
