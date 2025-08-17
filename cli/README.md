# OpenFrame CLI

A modern CLI tool for managing OpenFrame Kubernetes clusters and development workflows. Provides an interactive, user-friendly alternative to shell scripts with comprehensive cluster lifecycle management.

## Features

- **🎯 Interactive Cluster Creation** - Guided wizard with intelligent defaults
- **⚡ K3d Cluster Management** - Fast local Kubernetes clusters optimized for development  
- **📊 Cluster Status & Monitoring** - Real-time cluster health and node information
- **🔧 Smart System Detection** - Automatically configures based on your system resources
- **🛠 Developer-Friendly** - Simple commands with clear output and error handling

## Installation

### Build from Source

```bash
# Clone and build
git clone <repository-url>
cd openframe/cli

# Build the CLI
make build

# Alternative: Direct go build (specify output name)
go build -o openframe .

# Install to GOPATH/bin (optional)
make install

# Or copy to system PATH
cp build/openframe /usr/local/bin/
```

### Development

```bash
# Development workflow (build, test, lint)
make dev

# Quick check (build and unit tests)
make check

# Full test pipeline
make test

# Clean build artifacts
make clean
```

## Shell Script Migration

This CLI replaces the existing shell scripts:

| Shell Script | CLI Command | Description |
|--------------|-------------|-------------|
| `./run.sh k` | `openframe cluster create` | Create cluster interactively |
| `./run.sh d` | `openframe cluster delete` | Delete cluster with confirmation |
| `./run.sh s` | `openframe cluster start` | Start stopped cluster |
| `./run.sh c` | `openframe cluster cleanup` | Clean up cluster resources |

## Quick Start

### Prerequisites

- **Docker** - Must be running for K3d clusters
- **kubectl** - Kubernetes command-line tool  
- **K3d** - Local Kubernetes cluster runtime

### Basic Usage

```bash
# Create a cluster with interactive wizard
openframe cluster create

# List all clusters  
openframe cluster list

# Check cluster status
openframe cluster status

# Delete a cluster
openframe cluster delete
```

## Commands

### Cluster Management

#### `openframe cluster create [NAME]`
Creates a new K3d cluster with interactive configuration wizard.

**Options:**
- `--type k3d` - Cluster type (currently only K3d supported)
- `--nodes N` - Number of worker nodes (default: 3)  
- `--version VERSION` - Kubernetes version (e.g., v1.31.5-k3s1)
- `--skip-wizard` - Use command-line flags instead of interactive wizard
- `--dry-run` - Show what would be created without actually creating

**Examples:**
```bash
# Interactive creation (recommended)
openframe cluster create

# Create with specific options
openframe cluster create dev-cluster --nodes 2 --version v1.31.5-k3s1

# Quick creation without prompts
openframe cluster create test --skip-wizard --nodes 1
```

#### `openframe cluster list`
Shows all managed clusters with their status and node count.

```bash
openframe cluster list
# NAME                 TYPE       STATUS     NODES          
# ────────────────────────────────────────────────────────────
# openframe-dev        k3d        Running    4              
```

#### `openframe cluster status [NAME]`
Displays detailed information about a specific cluster.

```bash
openframe cluster status my-cluster
```

Shows:
- Cluster metadata (name, type, status, node count)
- Individual node details (name, role, status, age)  
- Installed Helm applications

#### `openframe cluster delete [NAME]`
Removes a cluster and cleans up all resources.

**Options:**
- `--force` - Skip confirmation prompt

**Examples:**
```bash
# Interactive deletion with confirmation
openframe cluster delete my-cluster

# Force deletion without confirmation  
openframe cluster delete my-cluster --force
```

#### `openframe cluster start [NAME]`
Starts a previously stopped cluster.

```bash
openframe cluster start my-cluster
```

#### `openframe cluster cleanup [NAME]`  
Removes unused Docker images and resources from cluster nodes.

```bash
openframe cluster cleanup my-cluster
```

## Cluster Configuration

### Interactive Wizard

The cluster creation wizard guides you through:

1. **Cluster Name** - Default: `openframe-dev`
2. **Cluster Type** - Currently supports K3d only
3. **Kubernetes Version** - Choose from available K3s versions
4. **Node Count** - Worker nodes (default: 3, automatically adds 1 control plane)

### System Detection

The CLI automatically detects your system and optimizes settings:

- **CPU Detection** - Configures optimal worker node count
- **Memory Detection** - Ensures sufficient resources
- **Architecture Detection** - Selects appropriate container images (ARM64/x86_64)
- **Port Detection** - Finds available ports (80, 443, 6550) or alternatives

### Default Configuration

- **Control Plane**: 1 node
- **Worker Nodes**: 3 nodes (adjustable)
- **Kubernetes Version**: v1.31.5-k3s1
- **Container Runtime**: K3s
- **Load Balancer**: Built-in (Traefik disabled)
- **Port Mappings**: 
  - HTTP: 80 → cluster port 80
  - HTTPS: 443 → cluster port 443
  - API: 6550 → cluster API server

## Examples

### Basic Cluster Management

```bash
# Create a cluster interactively
openframe cluster create

# Create with specific name and settings
openframe cluster create my-dev --nodes 2

# Check cluster status
openframe cluster status my-dev

# List all clusters
openframe cluster list

# Clean up cluster resources
openframe cluster cleanup my-dev

# Delete cluster
openframe cluster delete my-dev
```

## Troubleshooting

### Common Issues

**Docker not running**
- Start Docker Desktop (macOS) or `sudo systemctl start docker` (Linux)
- Verify with `docker ps`

**Cluster creation fails**
- Check Docker has sufficient resources (4GB+ RAM recommended)
- Ensure K3d is installed: `k3d version`
- Verify ports are available (will auto-detect alternatives)

**Kubectl not working**
- Cluster automatically configures kubeconfig
- Check context: `kubectl config current-context`
- Should show `k3d-<cluster-name>`

