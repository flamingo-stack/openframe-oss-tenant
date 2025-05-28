#!/bin/bash

# TELEPRESENCE
function tools_telepresence_wait() {
  echo "Waiting for telepresence to be ready"
  wait_for_app "client-tools" "app=traffic-manager"
}

function tools_telepresence_deploy() {
  echo "Checking telepresence status" &&
    if ! helm -n client-tools list | grep -q "traffic-manager.*"; then
      echo "Installing telepresence" &&
        [ -d $HOME/.config/telepresence ] || mkdir -p $HOME/.config/telepresence
      if [ ! -f $HOME/.config/telepresence/config.yml ]; then
        cp $HOME/.config/telepresence/config.yml $HOME/.config/telepresence/config.yml.bak
      fi

      tee $HOME/.config/telepresence/config.yml <<EOF
timeouts:
  helm: 1200s
EOF
      telepresence helm install -n client-tools
    else
      echo "Telepresence is already installed"
    fi

  if ! telepresence status | grep -q "OSS Traffic Manager: Connected"; then
    echo "Connecting telepresence" &&
      tools_telepresence_wait && telepresence connect
  else
    echo "Telepresence is already connected"
  fi
}

function tools_telepresence_delete() {
  echo "Deleting telepresence"
  telepresence quit
  telepresence helm uninstall
  kubectl delete namespace client-tools
}
