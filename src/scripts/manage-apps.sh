#!/bin/bash

APP=$1
ACTION=$2
IFWAIT=$3

[ "$APP" == "" ] && show_help_apps && exit 1

if [ "$APP" != "" ] && [ "$ACTION" != "" ]; then
  # Source required functions
  SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
  for s in "$SCRIPT_DIR/functions/"*; do source "$s"; done

  # PULL SECRETS
  kubectl create namespace infrastructure --dry-run=client -o yaml | kubectl apply -f -  && \
  kubectl -n infrastructure create secret docker-registry github-pat-secret \
    --docker-server=ghcr.io \
    --docker-username=vusal-fl \
    --docker-password=$(echo -n $GITHUB_TOKEN_CLASSIC) \
    --docker-email=vusal@flamingo.cx --dry-run=client -o yaml | kubectl apply -f -

fi

case "$APP" in
  telepresence)
    if [ "$ACTION" == "deploy" ]; then
      tools_telepresence_deploy
      if [ "$IFWAIT" == "--wait" ]; then tools_telepresence_wait; fi
    elif [ "$ACTION" == "delete" ]; then
      tools_telepresence_delete
    fi
    ;;
  ingress-nginx)
    if [ "$ACTION" == "deploy" ]; then
      infra_ingress_nginx_deploy
      if [ "$IFWAIT" == "--wait" ]; then infra_ingress_nginx_wait; fi
    fi
    ;;
  monitoring)
    if [ "$ACTION" == "deploy" ]; then
      infra_monitoring_deploy
      if [ "$IFWAIT" == "--wait" ]; then infra_monitoring_wait; fi
    elif [ "$ACTION" == "delete" ]; then
      infra_monitoring_delete
    fi
    ;;
  logging)
    if [ "$ACTION" == "deploy" ]; then
      infra_logging_deploy
      if [ "$IFWAIT" == "--wait" ]; then infra_logging_wait; fi
    elif [ "$ACTION" == "delete" ]; then
      infra_logging_delete
    fi
    ;;
  efk)
    if [ "$ACTION" == "deploy" ]; then
      infra_efk_deploy
      if [ "$IFWAIT" == "--wait" ]; then infra_efk_wait; fi
    elif [ "$ACTION" == "delete" ]; then
      infra_efk_delete
    fi
    ;;
  redis)
    if [ "$ACTION" == "deploy" ]; then
      infra_redis_deploy
      if [ "$IFWAIT" == "--wait" ]; then infra_redis_wait; fi
    elif [ "$ACTION" == "delete" ]; then
      infra_redis_delete
    fi
    ;;
  kafka)
    if [ "$ACTION" == "deploy" ]; then
      infra_kafka_deploy
      if [ "$IFWAIT" == "--wait" ]; then infra_kafka_wait; fi
    elif [ "$ACTION" == "delete" ]; then
      infra_kafka_delete
    fi
    ;;
  kafka-ui)
    if [ "$ACTION" == "deploy" ]; then
      tools_kafka_ui_deploy
      if [ "$IFWAIT" == "--wait" ]; then tools_kafka_ui_wait; fi
    elif [ "$ACTION" == "delete" ]; then
      tools_kafka_ui_delete
    fi
    ;;
  mongodb)
    if [ "$ACTION" == "deploy" ]; then
      infra_mongodb_deploy
      if [ "$IFWAIT" == "--wait" ]; then infra_mongodb_wait; fi
    elif [ "$ACTION" == "delete" ]; then
      infra_mongodb_delete
    fi
    ;;
  mongodb-exporter)
    if [ "$ACTION" == "deploy" ]; then
      infra_mongodb_exporter_deploy
      if [ "$IFWAIT" == "--wait" ]; then infra_mongodb_exporter_wait; fi
    elif [ "$ACTION" == "delete" ]; then
      infra_mongodb_exporter_delete
    fi
    ;;
  mongo-express)
    if [ "$ACTION" == "deploy" ]; then
      tools_mongo_express_deploy
      if [ "$IFWAIT" == "--wait" ]; then tools_mongo_express_wait; fi
    elif [ "$ACTION" == "delete" ]; then
      tools_mongo_express_delete
    fi
    ;;
  cassandra)
    if [ "$ACTION" == "deploy" ]; then
      infra_cassandra_deploy
      if [ "$IFWAIT" == "--wait" ]; then infra_cassandra_wait; fi
    elif [ "$ACTION" == "delete" ]; then
      infra_cassandra_delete
    fi
    ;;
  nifi)
    if [ "$ACTION" == "deploy" ]; then
      infra_nifi_deploy
      if [ "$IFWAIT" == "--wait" ]; then infra_nifi_wait; fi
    elif [ "$ACTION" == "delete" ]; then
      infra_nifi_delete
    fi
    ;;
  zookeeper)
    if [ "$ACTION" == "deploy" ]; then
      infra_zookeeper_deploy
      if [ "$IFWAIT" == "--wait" ]; then infra_zookeeper_wait; fi
    elif [ "$ACTION" == "delete" ]; then
      infra_zookeeper_delete
    fi
    ;;
  pinot)
    if [ "$ACTION" == "deploy" ]; then
      infra_pinot_deploy
      if [ "$IFWAIT" == "--wait" ]; then infra_pinot_wait; fi
    elif [ "$ACTION" == "delete" ]; then
      infra_pinot_delete
    fi
    ;;
  config-server)
    if [ "$ACTION" == "deploy" ]; then
      infra_config_server_deploy
      if [ "$IFWAIT" == "--wait" ]; then infra_config_server_wait; fi
    elif [ "$ACTION" == "delete" ]; then
      infra_config_server_delete
    fi
    ;;
  api)
    if [ "$ACTION" == "deploy" ]; then
      infra_api_deploy
      if [ "$IFWAIT" == "--wait" ]; then infra_api_wait; fi
    elif [ "$ACTION" == "delete" ]; then
      infra_api_delete
    fi
    ;;
  management)
    if [ "$ACTION" == "deploy" ]; then
      infra_management_deploy
      if [ "$IFWAIT" == "--wait" ]; then infra_management_wait; fi
    elif [ "$ACTION" == "delete" ]; then
      infra_management_delete
    fi
    ;;
  stream)
    if [ "$ACTION" == "deploy" ]; then
      infra_stream_deploy
      if [ "$IFWAIT" == "--wait" ]; then infra_stream_wait; fi
    elif [ "$ACTION" == "delete" ]; then
      infra_stream_delete
    fi
    ;;
  gateway)
    if [ "$ACTION" == "deploy" ]; then
      infra_gateway_deploy
      if [ "$IFWAIT" == "--wait" ]; then infra_gateway_wait; fi
    elif [ "$ACTION" == "delete" ]; then
      infra_gateway_delete
    fi
    ;;
  openframe-ui)
    if [ "$ACTION" == "deploy" ]; then
      infra_openframe_ui_deploy
      if [ "$IFWAIT" == "--wait" ]; then infra_openframe_ui_wait; fi
    elif [ "$ACTION" == "delete" ]; then
      infra_openframe_ui_delete
    fi
    ;;
  authentik)
    if [ "$ACTION" == "deploy" ]; then
      authentik_deploy
      if [ "$IFWAIT" == "--wait" ]; then authentik_wait; fi
    elif [ "$ACTION" == "delete" ]; then
      authentik_delete
    fi
    ;;
  fleet)
    if [ "$ACTION" == "deploy" ]; then
      fleet_deploy
      if [ "$IFWAIT" == "--wait" ]; then fleet_wait; fi
    elif [ "$ACTION" == "delete" ]; then
      fleet_delete
    fi
    ;;
  meshcentral)
    if [ "$ACTION" == "deploy" ]; then
      meshcentral_deploy
      if [ "$IFWAIT" == "--wait" ]; then meshcentral_wait; fi
    elif [ "$ACTION" == "delete" ]; then
      meshcentral_delete
    fi
    ;;
  rmm)
    if [ "$ACTION" == "deploy" ]; then
      tactical_rmm_deploy
      if [ "$IFWAIT" == "--wait" ]; then tactical_rmm_wait; fi
    elif [ "$ACTION" == "delete" ]; then
      tactical_rmm_delete
    fi
    ;;
  register-apps)
    # kubectl -n infrastructure apply -f ./kind-cluster/apps/jobs/register-tools.yaml && \
    # kubectl -n infrastructure wait --for=condition=Ready pod -l app=register-tools --timeout 20m
    ./kind-cluster/apps/jobs/register.sh
    ;;
  a|all)
    # ------------- ALL -------------
    $0 observability && \
    $0 logging && \
    $0 redis && \
    $0 kafka && \
    $0 mongodb && \
    $0 mongodb-exporter && \
    $0 cassandra && \
    $0 nifi && \
    $0 zookeeper && \
    $0 pinot && \
    $0 config-server && \
    $0 api && \
    $0 management && \
    $0 stream && \
    $0 gateway && \
    $0 openframe-ui && \
    $0 authentik && \
    $0 fleet && \
    $0 meshcentral && \
    $0 rmm && \
    $0 tools && \
    $0 register-apps
    ;;
  m|minimal)
    # ------------- ALL no wait for state=Ready -------------
    $0 ingress-nginx && \
    $0 observability
    ;;
  infrastructure)
    # ------------- INFRASTRUCTURE -------------
    $0 ingress-nginx && \
    $0 monitoring && \
    $0 redis
    $0 kafka
    $0 mongodb
    $0 mongodb-exporter
    $0 cassandra
    $0 nifi
    $0 zookeeper
    $0 pinot
    $0 config-server
    $0 api
    $0 management
    $0 stream
    $0 gateway
    $0 openframe-ui
    $0 tools
    ;;
  observability)
    $0 monitoring
    $0 logging
    ;;
  tools)
    $0 telepresence
    $0 mongo-express
    $0 kafka-ui
    ;;
  -h|--help|-Help)
    show_help_apps
    ;;
  *)
    echo "Get help with: $0 [ -h | --help | -Help ]"
    exit 1
esac
