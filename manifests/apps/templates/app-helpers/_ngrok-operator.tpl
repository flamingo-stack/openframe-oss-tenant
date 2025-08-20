{{- define "app-helpers.ngrok-operator" -}}
{{- $app := index . 1 -}}
{{- $vals := index . 2 -}}

{{- $result := index $app "values" | default dict -}}

{{/* Get credentials: deployment first, then root fallback */}}
{{- $creds := dict -}}
{{- if and $vals.deployment $vals.deployment.selfHosted $vals.deployment.selfHosted.ingress $vals.deployment.selfHosted.ingress.ngrok $vals.deployment.selfHosted.ingress.ngrok.credentials $vals.deployment.selfHosted.ingress.ngrok.credentials.authtoken -}}
  {{- $creds = $vals.deployment.selfHosted.ingress.ngrok.credentials -}}
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