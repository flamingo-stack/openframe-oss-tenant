
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
{{- $availableHelpers := list "ngrok-operator" "openframe-config" -}}

{{- if has $name $availableHelpers -}}
  {{- $helper := printf "app-helpers.%s" $name -}}
  {{- include $helper (list $name $app $vals) -}}
{{- else if hasKey $app "values" -}}
  {{- toYaml (index $app "values") -}}
{{- end -}}
{{- end }}
