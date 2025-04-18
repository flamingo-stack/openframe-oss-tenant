# OpenFrame Scripts Usage Guide

This guide explains how to use the OpenFrame scripts for development, deployment, and management of the platform.

## Prerequisites

Before using these scripts, ensure you have:

1. Required tools installed (script will check and help install if missing):
   - kind (Kubernetes in Docker)
   - docker
   - helm
   - kubectl
   - telepresence
   - skaffold
   - jq

2. Environment setup:
   - `GITHUB_TOKEN_CLASSIC` environment variable set with your GitHub token. Create classic token with read/write permission on packages and do export on terminal before running script

      ```bash
      export GITHUB_TOKEN_CLASSIC=ghp_XxXx
      ```

   - Linux: Ensure `fs.inotify.max_user_instances` is set to at least 1500 (if not done script will do it for you)

## Basic Commands

### Script Structure

The main entry point is `run.sh` which provides the following commands:

```bash
./run.sh <command> [options]
```

### Command Arguments

Most commands support both short and long argument formats:

```bash
# Short format examples
./run.sh k        # Manage cluster
./run.sh d        # Delete cluster
./run.sh a        # Manage apps
./run.sh b        # Bootstrap
./run.sh p        # Platform setup
./run.sh c        # Cleanup
./run.sh s        # Start cluster
./run.sh t        # Client tools

# Long format examples
./run.sh cluster  # Same as 'k'
./run.sh delete   # Same as 'd'
./run.sh app      # Same as 'a'
./run.sh bootstrap # Same as 'b'
./run.sh platform # Same as 'p'
./run.sh cleanup  # Same as 'c'
./run.sh start    # Same as 's'
./run.sh client_tools # Same as 't'
```

### Getting Help

You can get help information at any time using the following flags:

```bash
# For general script help
./run.sh -h
./run.sh -help
./run.sh -Help

# For detailed apps/components help
./run.sh a -h
./run.sh a -help
./run.sh a -Help
```

### Available Commands

1. **Pre-check Environment**

    ```bash
    ./run.sh pre
    ```

    Checks and helps install required tools and validates environment setup.

2. **Cluster Management**

    ```bash
    ./run.sh cluster    # Create new kind cluster
    ./run.sh delete     # Delete cluster
    ./run.sh start      # Start kind containers
    ./run.sh stop       # Stop kind containers
    ./run.sh cleanup    # Clean unused images from kind nodes
    ```

3. **Application Management**

    ```bash
    ./run.sh app <app-name> <action> [options]

    # TO see applciation names, you one of below flags
    ./run.sh a
    ```

    Actions:

    - `deploy`: Deploy the application
    - `delete`: Remove the application
    - `dev`: Run in development mode with live build and deploy (`skaffold`)
    - `debug`: Enable debug mode with port forwarding (`telepresence intercept` mode)

4. **Bootstrap Options**

    ```bash
    ./run.sh bootstrap  # Setup cluster and deploy all apps
    ./run.sh platform   # Setup cluster with only platform apps
    ```

## Application Bundles

The following application bundles are available:

### Quick Reference - Short and Long Arguments

```bash
# Platform and Observability
o, observability              # Observability stack
p, platform                   # Platform stack

# OpenFrame Components
od, openframe_datasources     # OpenFrame datasources
om, openframe_microservices   # OpenFrame microservices

# Integrated Tools
it, integrated_tools          # Integrated tools
itd, integrated_tools_datasources  # Integrated tools datasources

# Development Tools
t, client_tools               # Client tools
```

### Detailed Components

1. **Platform (p, platform)**
   - Ingress Nginx (`platform_ingress_nginx`)
   - Observability stack
     - Grafana, Prometheus (`platform_monitoring`)
     - Loki (`platform_logging`)
   - Metrics Server (`platform_metrics_server`)

2. **OpenFrame Datasources (od, openframe_datasources)**
   - Redis (`openframe_datasources_redis`)
   - Kafka (`openframe_datasources_kafka`)
   - MongoDB (`openframe_datasources_mongodb`)
   - Cassandra (`openframe_datasources_cassandra`)
   - NiFi (`openframe_datasources_nifi`)
   - Zookeeper (`openframe_datasources_zookeeper`)
   - Pinot (`openframe_datasources_pinot`)

3. **OpenFrame Microservices (om, openframe_microservices)**
   - Config Server (`openframe_microservices_openframe_config_server`)
   - API (`openframe_microservices_openframe_api`)
   - Management (`openframe_microservices_openframe_management`)
   - Stream (`openframe_microservices_openframe_stream`)
   - Gateway (`openframe_microservices_openframe_gateway`)
   - UI (`openframe_microservices_openframe_ui`)
   - Register Apps (`openframe_microservices_register_apps`)

4. **Integrated Tools Datasources (itd, integrated_tools_datasources)**
   - Fleet (`integrated_tools_datasources_fleet`)
   - Authentik (`integrated_tools_datasources_authentik`)
   - MeshCentral (`integrated_tools_datasources_meshcentral`)
   - Tactical RMM (`integrated_tools_datasources_tactical_rmm`)

5. **Integrated Tools (it, integrated_tools)**
   - Fleet (`integrated_tools_fleet`)
   - Authentik (`integrated_tools_authentik`)
   - MeshCentral (`integrated_tools_meshcentral`)
   - Tactical RMM (`integrated_tools_tactical_rmm`)

6. **Client Tools (t, client_tools)**
   - Kafka UI (`tools_kafka_ui`)
   - Mongo Express (`tools_mongo_express`)
   - Telepresence (`tools_telepresence`)

### Usage Examples

```bash
# Using short arguments
./run.sh app od deploy        # Deploy all OpenFrame datasources
./run.sh app om deploy        # Deploy all OpenFrame microservices
./run.sh app it deploy        # Deploy all integrated tools
./run.sh app t deploy         # Deploy all client tools

# Using long arguments
./run.sh app openframe_datasources deploy
./run.sh app openframe_microservices deploy
./run.sh app integrated_tools deploy

# Deploying individual components
./run.sh app openframe_datasources_redis deploy
./run.sh app openframe_microservices_openframe_api deploy
./run.sh app integrated_tools_fleet deploy

# Development mode examples
./run.sh app openframe_microservices_openframe_api dev
./run.sh app integrated_tools_meshcentral dev

# Debug mode examples
./run.sh app openframe_microservices_openframe_api debug 8080 http
```

## Development Workflow

### 1. Initial Setup

```bash
# Check environment and create cluster with platform services
./run.sh pre
./run.sh platform
```

### 2. Deploy Specific Components

```bash
# Deploy individual applications
./run.sh app openframe_datasources_redis deploy
./run.sh app openframe_microservices_openframe_api deploy

# Deploy entire bundles
./run.sh app od deploy  # All datasources
./run.sh app om deploy  # All microservices
```

### 3. Development Mode

```bash
# Run specific service in dev mode with live reload
./run.sh app openframe_microservices_openframe_api dev
```

### 4. Debugging

```bash
# Debug specific service with port forwarding
./run.sh app openframe_microservices_openframe_api debug <local_port> <remote_port_name>
```

## Environment Variables

- `GITHUB_TOKEN_CLASSIC`: Required for pulling images from GitHub Container Registry
- `IP`: IP address for ingress (default: `192.168.100.100`)
- `DOMAIN`: Domain for services (default: `${IP}.nip.io`)
- `K8S_VERSION`: Kubernetes version for kind cluster (Default: `1.32.3`)
- `PERSISTENT_VOLUMES`: Enable/disable persistent volumes (Default disabled)
- `KIND_VOLUME_PATH`: Path for kind volumes (default: `$HOME/kind-volumes`)

## Namespace Structure

The platform uses the following namespaces:

- `platform`: Core platform services
- `openframe-datasources`: Database and messaging services
- `openframe-microservices`: OpenFrame services
- `integrated-tools-datasources`: External tool dependencies
- `integrated-tools`: Integrated external tools
- `client-tools`: Development and monitoring tools

## Script folder structure

- `./scripts`: root folder for all scripts
- `./scripts/run.sh`: main script to run all other scripts (Don;t run other script individually, they will fail)
- `./scripts/functions`: Contains individual functions to be used in scripts in `./scripts`

## SSL Certificates

Repository contains already created ca cert and private key to be used by cert-manager. If you want to create new certificate for CA then run below comman:

```bash
# script will generate CA key/cert in ./scripts/files/ca folder
./scripts/run.sh generate-pki
```

Import generated certificates from [./scripts/files/ca](./files/ca/) folder to your browser, os trust store or anny tool's trust store based on your needs if you don't want to see self-signed certificate related errors or warnings.
