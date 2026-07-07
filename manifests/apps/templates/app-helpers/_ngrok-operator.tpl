{{- define "app-helpers.ngrok-operator" -}}
{{- $app := index . 1 -}}
{{- $vals := index . 2 -}}

{{- $result := index $app "values" | default dict -}}

{{/* Get credentials: deployment first, then root fallback */}}
{{- $creds := dict -}}
{{- if dig "ingress" "ngrok" "credentials" "authtoken" "" ($vals.deployment | default dict) -}}
  {{- $creds = dig "ingress" "ngrok" "credentials" (dict) $vals.deployment -}}
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