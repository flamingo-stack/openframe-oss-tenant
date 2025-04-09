function show_help() {
  echo "Usage:
$0 <parameter>

Parameters:

p|pre                                   : Check if all required commands are installed
k|cluster                               : Setup cluster only
d|down                                  : Remove cluster
a|app <app-name|all> <action> [--wait]  : Deploy <app-name> or 'all' apps
                              <action>  : deploy, build, delete, dev, debug (Required)
                              dev       : Build, deploy and run in dev mode
                                          Tail changes, build and deploy on change. (Delete app before using dev mode otherwise may require run twice)
  debug <local-port> <remote-port-name> : Enable debug mode and redirect traffic to local port (Use CTRL+C to stop)
                              --wait    : Wait for app to be ready (for deploy) (Optional)
b|bootstrap                   [--wait]  : Bootstrap whole cluster with all apps
m|minimal                     [--wait]  : Bootstrap whole cluster with base mandatory apps
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
  echo "  infrastructure       Deploy infrastructure applications"
  echo "      ingress-nginx    [i] Deploy Ingress Nginx"
  echo "      redis            [n] Deploy Redis"
  echo "      kafka            [f] Deploy Kafka"
  echo "      mongodb          [a] Deploy MongoDB"
  echo "      mongodb-exporter [s] Deploy MongoDB exporter"
  echo "      cassandra        [r] Deploy Cassandra"
  echo "      nifi             [u] Deploy NiFi"
  echo "      zookeeper        [c] Deploy Zookeeper"
  echo "      pinot            [t] Deploy Pinot"
  echo "      config-server    [u] Deploy Config Server"
  echo "      api              [r] Deploy API"
  echo "      management       [e] Deploy Management"
  echo "      stream           [-] Deploy Stream"
  echo "      gateway          [-] Deploy Gateway"
  echo "      openframe-ui     [-] Deploy OpenFrame UI"
  echo "      observability       Deploy monitoring"
  echo "  observability        Deploy monitoring"
  echo "      monitoring       [-] Deploy Grafana and Prometheus stack"
  echo "      logging          [-] Deploy Loki and Promtail"
  echo "  tools                Deploy tools"
  echo "      telepresence     [t] Deploy Telepresence"
  echo "      mongo-express    [o] Deploy Mongo Express"
  echo "      kafka-ui         [o] Deploy Kafka UI"
  echo "  authentik            Deploy Authentik"
  echo "  fleet                Deploy Fleet"
  echo "  meshcentral          Deploy Mesh Central"
  echo "  rmm                  Deploy RMM"
  echo "  register-apps       Register apps"
  echo
  echo "  a|all                Deploy all applications"
  echo "  m|minimal            Deploy base applications"

  return 0
}
