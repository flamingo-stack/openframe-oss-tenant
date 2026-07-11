{{- define "app-helpers.openframe-config" -}}
{{- $app := index . 1 -}}
{{- $vals := index . 2 -}}

{{- $result := index $app "values" | default dict -}}

{{/* config server serves Spring config from this repo — pass the git branch */}}
{{- $_ := set $result "repository" (dict "branch" $vals.repository.branch) -}}

{{- toYaml $result -}}
{{- end }}
