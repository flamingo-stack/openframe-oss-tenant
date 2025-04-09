#!/bin/bash

for ns in infrastructure authentik fleet meshcentral tactical-rmm; do
  kubectl create namespace $ns --dry-run=client -o yaml | kubectl apply -f -  && \
  kubectl -n $ns create secret docker-registry github-pat-secret \
    --docker-server=ghcr.io \
    --docker-username=vusal-fl \
    --docker-password=$(echo -n $GITHUB_TOKEN_CLASSIC) \
    --docker-email=vusal@flamingo.cx --dry-run=client -o yaml | kubectl apply -f -
done
