function show_help() {
  echo "Usage:
$0 <parameter>

Parameters:

pre                                     : Check if all required commands are installed
k|cluster                               : Setup cluster only
d|delete                                : Remove cluster
a|app <app-name|all> <action>           : Deploy <app-name> or 'all' apps
                              <action>  : deploy, build, delete, dev, debug (Required)
                              dev       : Build, deploy and run in dev mode
                                          Tail changes, build and deploy on change. (Delete app before using dev mode otherwise may require run twice)
  debug <local-port> <remote-port-name> : Enable debug mode and redirect traffic to local port (Use CTRL+C to stop)
b|bootstrap                             : Bootstrap cluster with all apps
s|start                                 : Start kind cluster
stop                                    : Stop kind cluster
p|platform                              : Bootstrap cluster with base mandatory apps
c|cleanup                               : Remove unused images from kind nodes

Examples:
  $0 app all deploy                     : Deploy all applications
  $0 app redis deploy                   : Deploy only Redis
  $0 app redis deploy --wait            : Deploy only Redis and wait for it to be ready
  $0 app redis delete                   : Delete Redis
  $0 app redis dev                      : Deploy Redis in dev mode
"
  return 0
}

function show_help_apps() {
  echo "Available apps and bundles:"
  echo "  o|observability                  Deploy monitoring stack"
  echo "      platform_monitoring          Deploy Grafana and Prometheus stack"
  echo "      platform_metrics_server      Deploy Metrics Server"
  echo "      platform_logging             Deploy Loki and Promtail"
  echo "  p|platform                       Deploy platform applications"
  echo "      platform_ingress_nginx       Deploy Ingress Nginx"
  echo "      observability                Deploy monitoring stack"
  echo "  od|openframe_datasources         Deploy openframe_datasources applications"
  echo "      redis                        Deploy Redis"
  echo "      kafka                        Deploy Kafka"
  echo "      mongodb                      Deploy MongoDB"
  echo "      mongodb_exporter             Deploy MongoDB exporter"
  echo "      cassandra                    Deploy Cassandra"
  echo "      nifi                         Deploy NiFi"
  echo "      zookeeper                    Deploy Zookeeper"
  echo "      pinot                        Deploy Pinot"
  echo "  om|openframe_microservices       Deploy openframe_microservices applications"
  echo "      openframe_config_server      Deploy Config Server"
  echo "      openframe_api                Deploy API"
  echo "      openframe_management         Deploy Management"
  echo "      openframe_stream             Deploy Stream"
  echo "      openframe_gateway            Deploy Gateway"
  echo "      openframe_ui                 Deploy OpenFrame UI"
  echo "  openframe_microservices_register_apps                    Register apps"
  echo "  itd|integrated_tools_datasources Deploy integrated_tools_datasources applications"
  echo "      fleet                        Deploy Fleet datasources"
  echo "      authentik                    Deploy Authentik datasources"
  echo "      meshcentral                  Deploy MeshCentral datasources"
  echo "      tactical_rmm                 Deploy Tactical RMM datasources"
  echo "  it|integrated_tools              Deploy integrated tools"
  echo "      fleet                        Deploy Fleet"
  echo "      authentik                    Deploy Authentik"
  echo "      meshcentral                  Deploy MeshCentral"
  echo "      tactical_rmm                 Deploy Tactical RMM"
  echo "  t|client_tools                   Deploy tools"
  echo "      kafka_ui                     Deploy Kafka UI"
  echo "      mongo_express                Deploy Mongo Express"
  echo "      telepresence                 Deploy Telepresence"
  echo
  echo "  a|all                            Deploy all applications"
  echo "  -h|--help|-Help                  Show this help message"

  return 0
}
