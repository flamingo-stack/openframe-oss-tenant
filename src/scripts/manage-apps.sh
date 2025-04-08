#!/bin/bash

APP=$1
ACTION=$2
IFWAIT=$3

if [ -z "$APP" ]; then
  show_help_apps
  exit 0
fi

if [ "$APP" != "" ] && [ "$ACTION" != "" ]; then
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
  observability)
    ACTION=${2}
    IFWAIT=${3:-}

    $0 monitoring $ACTION $IFWAIT && \
    $0 logging $ACTION $IFWAIT
    ;;
  m|minimal)
    # ------------- ALL no wait for state=Ready -------------
    ACTION=${2}
    IFWAIT=${3:-}

    $0 ingress-nginx $ACTION $IFWAIT && \
    $0 observability $ACTION $IFWAIT
    ;;
  tools)
    ACTION=${2}
    IFWAIT=${3:-}

    $0 telepresence $ACTION $IFWAIT && \
    $0 mongo-express $ACTION $IFWAIT && \
    $0 kafka-ui $ACTION $IFWAIT
    ;;
  infrastructure)
    # ------------- INFRASTRUCTURE -------------
    ACTION=${2}
    IFWAIT=${3:-}

    $0 minimal $ACTION $IFWAIT && \
    $0 redis $ACTION $IFWAIT && \
    $0 kafka $ACTION $IFWAIT && \
    $0 mongodb $ACTION $IFWAIT && \
    $0 mongodb-exporter $ACTION $IFWAIT && \
    $0 cassandra $ACTION $IFWAIT && \
    $0 nifi $ACTION $IFWAIT && \
    $0 zookeeper $ACTION $IFWAIT && \
    $0 pinot $ACTION $IFWAIT && \
    $0 config-server $ACTION $IFWAIT && \
    $0 api $ACTION $IFWAIT && \
    $0 management $ACTION $IFWAIT && \
    $0 stream $ACTION $IFWAIT && \
    $0 gateway $ACTION $IFWAIT && \
    $0 openframe-ui $ACTION $IFWAIT && \
    $0 tools $ACTION $IFWAIT
    ;;
  a|all)
    # ------------- ALL -------------
    ACTION=${2}
    IFWAIT=${3:-}

    $0 minimal $ACTION $IFWAIT && \
    $0 redis $ACTION $IFWAIT && \
    $0 kafka $ACTION $IFWAIT && \
    $0 mongodb $ACTION $IFWAIT && \
    $0 mongodb-exporter $ACTION $IFWAIT && \
    $0 cassandra $ACTION $IFWAIT && \
    $0 nifi $ACTION $IFWAIT && \
    $0 zookeeper $ACTION $IFWAIT && \
    $0 pinot $ACTION $IFWAIT && \
    $0 config-server $ACTION $IFWAIT && \
    $0 api $ACTION $IFWAIT && \
    $0 management $ACTION $IFWAIT && \
    $0 stream $ACTION $IFWAIT && \
    $0 gateway $ACTION $IFWAIT && \
    $0 openframe-ui $ACTION $IFWAIT && \
    $0 authentik $ACTION $IFWAIT && \
    $0 fleet $ACTION $IFWAIT && \
    $0 meshcentral $ACTION $IFWAIT && \
    $0 rmm $ACTION $IFWAIT && \
    $0 tools $ACTION $IFWAIT && \
    $0 register-apps
    ;;
  -h|--help|-Help)
    show_help_apps
    ;;
  *)
    echo "Unknown app: $APP"
    show_help_apps
    exit 1
esac
