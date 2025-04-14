function show_help() {
  echo "Usage:
$0 <parameter>

Parameters:

p|pre                                   : Check if all required commands are installed
k|cluster                               : Setup cluster only
d|delete                                : Remove cluster
a|app <app-name|all> <action> [--wait]  : Deploy <app-name> or 'all' apps
                              <action>  : deploy, build, delete, dev, debug (Required)
                              dev       : Build, deploy and run in dev mode
                                          Tail changes, build and deploy on change. (Delete app before using dev mode otherwise may require run twice)
  debug <local-port> <remote-port-name> : Enable debug mode and redirect traffic to local port (Use CTRL+C to stop)
                              --wait    : Wait for app to be ready (for deploy) (Optional)
b|bootstrap                   [--wait]  : Bootstrap cluster with all apps
s|start                                 : Start kind cluster
stop                                    : Stop kind cluster
p|platform                    [--wait]  : Bootstrap cluster with base mandatory apps
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
  echo "Available options:"
  echo "  o|observability             Deploy monitoring"
  echo "      monitoring              Deploy Grafana and Prometheus stack"
  echo "      logging                 Deploy Loki and Promtail"
  echo "  p|platform                  Deploy platform applications"
  echo "      ingress-nginx           Deploy Ingress Nginx"
  echo "      metrics-server          Deploy Metrics Server"
  echo "      observability           Deploy monitoring"
  echo "  od|openframe_datasources    Deploy openframe_datasources applications"
  echo "      redis                   Deploy Redis"
  echo "      kafka                   Deploy Kafka"
  echo "      mongodb                 Deploy MongoDB"
  echo "      mongodb-exporter        Deploy MongoDB exporter"
  echo "      cassandra               Deploy Cassandra"
  echo "      nifi                    Deploy NiFi"
  echo "      zookeeper               Deploy Zookeeper"
  echo "  om|openframe_microservices  Deploy openframe_microservices applications"
  echo "      pinot                   Deploy Pinot"
  echo "      config-server           Deploy Config Server"
  echo "      api                     Deploy API"
  echo "      management              Deploy Management"
  echo "      stream                  Deploy Stream"
  echo "      gateway                 Deploy Gateway"
  echo "      openframe-ui            Deploy OpenFrame UI"
  echo "  t|client_tools              Deploy tools"
  echo "      telepresence            Deploy Telepresence"
  echo "      mongo-express           Deploy Mongo Express"
  echo "      kafka-ui                Deploy Kafka UI"
  echo "  authentik                   Deploy Authentik"
  echo "  fleet                       Deploy Fleet"
  echo "  meshcentral                 Deploy Mesh Central"
  echo "  rmm                         Deploy RMM"
  echo "  register-apps       Register apps"
  echo
  echo "  a|all                Deploy all applications"
  echo "  m|minimal            Deploy base applications"

  return 0
}
