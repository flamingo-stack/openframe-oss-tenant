function show_help() {
  echo "Usage:
$0 <parameter>

Parameters:

pre                                     : Check if all required commands are installed
k|cluster                               : Setup cluster only
d|delete                                : Remove cluster
s|start                                 : Start kind cluster
stop                                    : Stop kind cluster
c|cleanup                               : Remove unused images from kind nodes

p|platform                              : Bootstrap cluster with base mandatory apps
b|bootstrap                             : Bootstrap cluster with all apps
a|app <app-name|all> <action>           : Deploy <app-name> or 'all' apps

  Actions:                              : (Required)
  deploy                                : Deploy app
  build                                 : Build app
  delete                                : Delete app
  dev                                   : Build, deploy and run in dev mode
                                          Tail changes, build and deploy on change.
                                          (Delete app before using dev mode otherwise may
                                          require run twice)
  intercept <localport> <remoteportname>: Enable intercept mode and redirect traffic to local
                                          port (Use CTRL+C to stop)


Examples:
  $0 app all deploy                     : Deploy all applications
  $0 app redis deploy                   : Deploy only Redis
  $0 app redis deploy --wait            : Deploy only Redis and wait for it to be ready
  $0 app redis delete                   : Delete Redis
  $0 app redis dev                      : Deploy Redis in dev mode
"
  return 0
}
