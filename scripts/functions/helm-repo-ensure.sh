#!/bin/bash

function helm_repo_ensure() {
  local repo_name=$1
  local repo_url=$2

  echo "Checking if helm repo ${repo_name} [${repo_url}] exists"
  if ! helm repo list | grep -q "${repo_name}.*${repo_url}"; then
    echo "Adding helm repo ${repo_name} [${repo_url}]"
    helm repo add "${repo_name}" "${repo_url}"
  fi
}
