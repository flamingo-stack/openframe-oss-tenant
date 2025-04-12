#!/bin/bash

parse_json_input() {
  local field="$1"
  grep -o "\"$field\":[^,}]*" | sed 's/"'"$field"'":"\{0,1\}\([^",}]*\)"\{0,1\}/\1/'
}
