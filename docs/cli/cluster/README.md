# cluster

Manage Kubernetes clusters for OpenFrame development.

## Synopsis

```bash
openframe cluster [command] [flags]
openframe cluster [command] [flags] [arguments]
```

## Description

The `cluster` command group provides comprehensive Kubernetes cluster lifecycle management functionality. It supports creating, deleting, listing, monitoring, and cleaning up K3d clusters optimized for local development.

## Available Commands

| Command | Aliases | Description |
|---------|---------|-------------|
| `create` | - | Create a new Kubernetes cluster |
| `delete` | - | Delete a Kubernetes cluster |
| `list` | - | List all Kubernetes clusters |
| `status` | - | Show detailed cluster status |
| `cleanup` | `c` | Clean up unused cluster resources |

## Command Aliases

The cluster command itself can be invoked using:
- `openframe cluster`
- `openframe k`

## Global Flags

These flags are available for all cluster subcommands:

| Flag | Short | Description | Default |
|------|-------|-------------|---------|
| `--verbose` | `-v` | Enable verbose output | `false` |
| `--silent` | - | Suppress all output except errors | `false` |
| `--dry-run` | - | Show what would be done without executing | `false` |
| `--force` | `-f` | Skip confirmation prompts | `false` |

## Examples

### Basic Workflow

```bash
# Create a new cluster interactively
openframe cluster create

# List all clusters
openframe cluster list

# Check cluster status
openframe cluster status my-cluster

# Clean up resources
openframe cluster cleanup my-cluster

# Delete cluster
openframe cluster delete my-cluster
```

### Quick Commands

```bash
# Create cluster with defaults (skip wizard)
openframe cluster create my-dev --skip-wizard

# Force delete without confirmation
openframe cluster delete my-dev --force

# List clusters with minimal output
openframe cluster list --quiet
```

### Using Aliases

```bash
# Using the 'k' alias
openframe k create
openframe k list

# Using cleanup alias 'c'
openframe cluster c my-dev
```

## Interactive Features

When no cluster name is provided for commands that require one (`delete`, `status`, `cleanup`), an interactive selector will be displayed allowing you to choose from available clusters.

```bash
# Interactive cluster selection
openframe cluster delete
# Displays list of clusters to choose from
```

## Exit Codes

- `0` - Success
- `1` - General error
- `2` - Prerequisites not met
- `3` - Cluster already exists
- `4` - Cluster not found

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `KUBECONFIG` | Path to kubeconfig file | `~/.kube/config` |
| `OPENFRAME_CLUSTER_TYPE` | Default cluster type | `k3d` |

## See Also

- [create](create.md) - Create a new Kubernetes cluster
- [delete](delete.md) - Delete a Kubernetes cluster
- [list](list.md) - List all clusters
- [status](status.md) - Show cluster status
- [cleanup](cleanup.md) - Clean up cluster resources

## Notes

- Clusters are managed through Docker containers for K3d type
- Each cluster automatically configures kubectl context
- Port mappings are automatically detected to avoid conflicts
- System resources are automatically detected for optimal configuration