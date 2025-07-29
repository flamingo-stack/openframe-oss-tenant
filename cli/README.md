# OpenFrame CLI - Interactive Kubernetes Platform Bootstrapper

A modern, user-friendly CLI that replaces shell scripts with an interactive terminal UI for managing OpenFrame Kubernetes deployments. Built following CLI design best practices with wizard-style interactive prompts.

## Key Features

- **Interactive Wizard** - Step-by-step guided setup with smart defaults  
- **Cluster Management** - K3d, Kind, and cloud provider support  
- **Helm Integration** - App-of-Apps pattern with ArgoCD  
- **Developer Tools** - Telepresence, Skaffold workflows  
- **Prerequisite Checking** - Validates tools before running  

## 🆚 Shell Script Replacement

This CLI completely replaces the existing shell scripts with equivalent functionality:

| Shell Script | CLI Command | Description |
|--------------|-------------|-------------|
| `./run.sh b` | `openframe bootstrap` | Bootstrap entire platform |
| `./run.sh k` | `openframe cluster create` | Create cluster only |
| `./run.sh d` | `openframe cluster delete` | Delete cluster |
| `./run.sh s` | `openframe cluster start` | Start cluster |
| `./run.sh stop` | `openframe cluster stop` | Stop cluster |
| `./run.sh c` | `openframe cluster cleanup` | Clean up images |
| `./run.sh app <name> dev` | `openframe dev skaffold <name>` | Development mode |
| `./run.sh app <name> intercept` | `openframe dev intercept <name>` | Telepresence intercept |

## Quick Start

### Prerequisites

Before using the OpenFrame CLI, ensure you have the following tools installed:

- **Go 1.21+** - For building the CLI
- **Docker** - For running local clusters
- **kubectl** - Kubernetes command-line tool
- **Helm** - Package manager for Kubernetes
- **K3d** or **Kind** - Local Kubernetes cluster tools

Optional developer tools:
- **Telepresence** - For service intercepts
- **Skaffold** - For continuous development
- **ArgoCD CLI** - For GitOps management

### Installation

#### From Source

```bash
# Clone the repository
git clone <repository-url>
cd openframe/cli

# Build and install
make build
make install

# Or install system-wide (requires sudo)
make install-system
```

#### Using Go Install

```bash
go install github.com/flamingo/openframe-cli@latest
```

### Usage

#### Create a Cluster (Interactive Wizard)

```bash
# Start the interactive wizard
openframe cluster create

# The wizard will guide you through:
# 1. Cluster configuration (name, type, version)
# 2. Component selection
# 3. Deployment mode
# 4. Installation process
```

#### Create a Cluster (Command Line)

```bash
# Create a K3d cluster with specific options
openframe cluster create my-cluster --type k3d --nodes 3 --version v1.29.0

# Create without installing OpenFrame components
openframe cluster create my-cluster --skip-charts
```

#### List and Manage Clusters

```bash
# List all clusters
openframe cluster list

# Show cluster status
openframe cluster status my-cluster

# Delete a cluster
openframe cluster delete my-cluster
```

#### Developer Workflows

```bash
# Intercept a service for local development
openframe dev intercept openframe-api 8090

# Run Skaffold continuous development
openframe dev skaffold openframe-ui

# Port forward a service
openframe dev port-forward mongodb 27017:27017 --namespace datasources

# Check development environment status
openframe dev status
```

## Commands

### Cluster Management

- `openframe cluster create [NAME]` - Create a new cluster with interactive wizard
- `openframe cluster delete [NAME]` - Delete a cluster and cleanup resources
- `openframe cluster list` - List all managed clusters
- `openframe cluster status [NAME]` - Show detailed cluster information

### Developer Tools

- `openframe dev intercept [SERVICE] [PORT]` - Intercept service traffic with Telepresence
- `openframe dev skaffold [SERVICE]` - Start Skaffold development workflow
- `openframe dev port-forward [SERVICE] [PORTS]` - Forward ports from cluster services
- `openframe dev status` - Show development environment status

## Configuration

### Cluster Types

**K3d (Recommended for local development)**
- Lightweight Kubernetes in Docker
- Fast startup and teardown
- Excellent for development workflows

**Kind**
- Kubernetes in Docker (alternative to K3d)
- More compatible with some tools
- Good for CI/CD environments

**GKE (Google Cloud)**
- Managed Kubernetes on Google Cloud
- Production-ready with auto-scaling
- Requires GCP account and credentials

**EKS (AWS)**
- Managed Kubernetes on AWS
- Enterprise features and integrations
- Requires AWS account and credentials

### Deployment Modes

**Local Development**
- Development-focused setup
- Hot reload and debugging tools enabled
- Minimal resource requirements
- Developer tools pre-configured

**Production-like**
- Production-similar setup
- Monitoring, logging, and security enabled
- External tools integrated
- Higher resource requirements

**Minimal**
- Basic setup with core services only
- Lowest resource usage
- Perfect for testing or resource-constrained environments

### Component Selection

During cluster creation, you can choose which components to install:

- **ArgoCD** - GitOps continuous delivery platform
- **Monitoring** - Prometheus, Grafana, and Loki stack
- **OpenFrame API** - Core OpenFrame API service
- **OpenFrame UI** - Web-based user interface
- **External Tools** - MeshCentral, Tactical RMM, Fleet MDM
- **Developer Tools** - Telepresence and Skaffold integration

## Development

### Building from Source

```bash
# Install dependencies
make deps

# Build the CLI
make build

# Run tests
make test

# Build for all platforms
make build-all

# Run the full CI workflow
make ci
```

### Project Structure

```
cli/
├── cmd/                    # Cobra commands
│   ├── root.go            # Root command and global flags
│   ├── cluster.go         # Cluster management commands
│   └── dev.go             # Developer workflow commands
├── pkg/                   # Core packages
│   ├── cluster/           # Cluster provider implementations
│   ├── helm/              # Helm chart installation logic
│   └── ui/                # Interactive UI components
├── go.mod                 # Go module dependencies
├── main.go                # CLI entry point
├── Makefile              # Build and development commands
└── README.md             # This file
```

### Adding New Cluster Providers

To add support for a new cluster provider:

1. Implement the `ClusterProvider` interface in `pkg/cluster/`
2. Add the provider to the cluster type enum
3. Update the wizard UI to include the new option
4. Add provider creation logic in `cmd/cluster.go`

### Adding New Components

To add a new installable component:

1. Add the component to the wizard in `pkg/ui/prompts.go`
2. Add Helm chart installation logic in `pkg/helm/installer.go`
3. Update the configuration summary display

## Examples

### Complete Development Setup

```bash
# Create a development cluster with all tools
openframe cluster create dev-cluster

# Intercept the API service for local development
openframe dev intercept openframe-api 8090

# In another terminal, start your local API server on port 8090
# Traffic from the cluster will now route to your local service

# Start continuous development for the UI
openframe dev skaffold openframe-ui
```

### Production-like Testing

```bash
# Create a production-like cluster
openframe cluster create prod-test --type k3d --nodes 5

# Check cluster status and installed components
openframe cluster status prod-test

# Access monitoring dashboards
openframe dev port-forward grafana 3000:80 --namespace platform
```

### Multi-cluster Development

```bash
# Create multiple clusters for different purposes
openframe cluster create api-dev --type k3d --nodes 2
openframe cluster create ui-dev --type kind --nodes 1

# List all clusters
openframe cluster list

# Switch between clusters using kubectl
kubectl config use-context k3d-api-dev
kubectl config use-context kind-ui-dev
```

## Troubleshooting

### Common Issues

**Cluster creation fails**
- Check Docker is running and has sufficient resources
- Ensure ports 80, 443, and 6550 are available
- Verify K3d or Kind is installed and in PATH

**Service intercept fails**
- Check Telepresence is installed and connected
- Verify the service exists in the specified namespace
- Ensure the target port is not already in use locally

**Skaffold development fails**
- Check `skaffold.yaml` exists in the service directory
- Verify Docker images can be built
- Ensure cluster has sufficient resources

**Helm installation fails**
- Check cluster has sufficient resources
- Verify Helm repositories are accessible
- Review cluster logs for specific errors

### Getting Help

- Use `openframe --help` for command usage
- Use `openframe <command> --help` for specific command help
- Check cluster status with `openframe cluster status`
- Review development environment with `openframe dev status`

### Log Locations

- Cluster creation logs: `~/.openframe/logs/`
- Kubernetes logs: `kubectl logs <pod-name> -n <namespace>`
- ArgoCD application status: ArgoCD UI or `argocd app list`

## Contributing

We welcome contributions! Please see our [contributing guidelines](../CONTRIBUTING.md) for details on:

- Code style and conventions
- Testing requirements
- Pull request process
- Issue reporting

## License

This project is licensed under the [MIT License](../LICENSE).

## Support

For support and questions:

- Create an issue in the repository
- Check the [OpenFrame documentation](../docs/)
- Join our community discussions