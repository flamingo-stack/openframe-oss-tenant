{{- define "app-helpers.ngrok-operator" -}}
{{- $app := index . 1 -}}
{{- $vals := index . 2 -}}

{{- $result := index $app "values" | default dict -}}

{{/* Get credentials: deployment first, then root fallback */}}
{{- $creds := dict -}}
{{- if and $vals.deployment $vals.deployment.ingress $vals.deployment.ingress.ngrok $vals.deployment.ingress.ngrok.credentials $vals.deployment.ingress.ngrok.credentials.authtoken -}}
  {{- $creds = $vals.deployment.ingress.ngrok.credentials -}}
{{- else if hasKey $vals "ngrok-operator" -}}
  {{- if index $vals "ngrok-operator" "credentials" -}}
    {{- $creds = index $vals "ngrok-operator" "credentials" -}}
  {{- end -}}
{{- end -}}

{{- if $creds.authtoken -}}
  {{- $_ := set $result "ngrok-operator" (dict "credentials" $creds) -}}
{{- end -}}

{{- toYaml $result -}}
{{- end }}