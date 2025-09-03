# cluster create

Create a new Kubernetes cluster with interactive configuration or quick defaults.

## Synopsis

```bash
openframe cluster create [NAME] [flags]
```

## Description

Creates a new K3d cluster optimized for OpenFrame development. By default, launches an interactive wizard to guide you through configuration. Existing clusters with the same name will be recreated.

The command offers two modes:
1. **Interactive Wizard** (default) - Step-by-step configuration with smart defaults
2. **Quick Creation** - Use flags to skip the wizard and create immediately

## Arguments

| Argument | Description | Default |
|----------|-------------|---------|
| `NAME` | Cluster name (optional) | `openframe-dev` |

## Flags

| Flag | Short | Description | Default |
|------|-------|-------------|---------|
| `--nodes` | `-n` | Number of worker nodes | `3` |
| `--type` | `-t` | Cluster type (k3d, gke) | `k3d` |
| `--version` | - | Kubernetes version | `v1.31.5-k3s1` |
| `--skip-wizard` | - | Skip interactive wizard | `false` |
| `--dry-run` | - | Show configuration without creating | `false` |
| `--force` | `-f` | Skip confirmation prompts | `false` |
| `--verbose` | `-v` | Enable verbose output | `false` |
| `--silent` | - | Suppress all output except errors | `false` |

## Interactive Wizard

When `--skip-wizard` is not provided, the command presents two options:

1. **Quick start with defaults** - Press Enter to create immediately with:
   - Name: `openframe-dev` (or provided name)
   - Type: K3d
   - Nodes: 3 workers + 1 control plane
   - Version: Latest stable K3s

2. **Interactive configuration** - Customize:
   - Cluster name
   - Cluster type
   - Kubernetes version (from available versions)
   - Number of worker nodes

## Examples

### Interactive Mode

```bash
# Launch interactive wizard
openframe cluster create

# Interactive wizard with custom name
openframe cluster create my-cluster
```

### Quick Creation

```bash
# Create with all defaults, skip wizard
openframe cluster create --skip-wizard

# Create with custom name and defaults
openframe cluster create dev-env --skip-wizard

# Specify node count
openframe cluster create --nodes 2 --skip-wizard

# Custom configuration without wizard
openframe cluster create prod-test --nodes 5 --type k3d --version v1.31.5-k3s1 --skip-wizard
```

### Dry Run

```bash
# Preview what would be created
openframe cluster create --dry-run

# Preview with custom settings
openframe cluster create my-cluster --nodes 4 --dry-run
```

### Advanced Usage

```bash
# Verbose output for debugging
openframe cluster create --verbose --skip-wizard

# Silent mode for scripts
openframe cluster create my-cluster --silent --skip-wizard

# Force recreation of existing cluster
openframe cluster create existing-cluster --force --skip-wizard
```

## Cluster Configuration

### Default Settings

- **Control Plane**: 1 node (always)
- **Worker Nodes**: 3 (configurable)
- **Load Balancer**: Built-in
- **Port Mappings**:
  - `80` ’ Cluster port 80 (HTTP)
  - `443` ’ Cluster port 443 (HTTPS)  
  - `6550` ’ Cluster API server

### System Detection

The command automatically detects and configures:
- Available ports (finds alternatives if defaults are in use)
- System architecture (ARM64/x86_64)
- Available CPU cores
- Available memory

### Resource Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU Cores | 2 | 4+ |
| Memory | 4GB | 8GB+ |
| Disk Space | 10GB | 20GB+ |

## Output

### Success Output

```
 Creating cluster "my-cluster"...
  " Cluster type: k3d
  " Kubernetes version: v1.31.5-k3s1
  " Nodes: 1 control-plane, 3 workers

 Cluster created successfully!
 Kubeconfig updated

Cluster "my-cluster" is ready for use.
Run 'openframe chart install my-cluster' to install ArgoCD.
```

### Dry Run Output

```
Would create cluster with configuration:
  Name: my-cluster
  Type: k3d
  Version: v1.31.5-k3s1
  Nodes: 4 (1 control-plane, 3 workers)
  Ports: 80, 443, 6550
```

## Exit Codes

- `0` - Cluster created successfully
- `1` - Creation failed
- `2` - Prerequisites not met (Docker, k3d)
- `3` - Cluster already exists (without --force)
- `130` - User cancelled (Ctrl+C)

## Post-Creation Steps

After successful creation:

1. Kubectl context is automatically configured
2. Cluster is ready for chart installation
3. Run `openframe chart install [cluster-name]` to deploy ArgoCD

## Troubleshooting

### Common Issues

**Port already in use**
```bash
# The command automatically finds alternative ports
# Or manually specify different ports in the wizard
```

**Docker not running**
```bash
# Start Docker first
# macOS: Start Docker Desktop
# Linux: sudo systemctl start docker
```

**Insufficient resources**
```bash
# Reduce node count
openframe cluster create --nodes 1 --skip-wizard
```

## See Also

- [cluster](README.md) - Cluster command overview
- [cluster delete](delete.md) - Delete a cluster
- [cluster list](list.md) - List all clusters
- [cluster status](status.md) - Check cluster status
- [chart install](../chart/install.md) - Install ArgoCD after creation

## Notes

- Existing clusters with the same name are automatically deleted and recreated
- Each cluster gets its own kubectl context named `k3d-[cluster-name]`
- The wizard validates all inputs before proceeding
- System resources are checked before creation