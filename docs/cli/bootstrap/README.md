# bootstrap

Complete OpenFrame environment setup with a single command.

## Synopsis

```bash
openframe bootstrap [cluster-name] [flags]
```

## Description

The `bootstrap` command provides a streamlined way to set up a complete OpenFrame environment by combining cluster creation and chart installation into a single operation. This is the recommended approach for new users and quick environment setup.

Bootstrap performs these operations sequentially:
1. Creates a Kubernetes cluster (`openframe cluster create`)
2. Installs ArgoCD and app-of-apps (`openframe chart install`)

## Arguments

| Argument | Description | Default |
|----------|-------------|---------|
| `cluster-name` | Name for the new cluster | `openframe-dev` |

## Flags

Bootstrap inherits global flags from the root command:

| Flag | Short | Description | Default |
|------|-------|-------------|---------|
| `--verbose` | `-v` | Enable verbose output | `false` |
| `--silent` | - | Suppress output except errors | `false` |

Note: Bootstrap uses default configurations for both cluster creation and chart installation. For customization, use the individual commands directly.

## Examples

### Basic Usage

```bash
# Bootstrap with default cluster name (openframe-dev)
openframe bootstrap

# Bootstrap with custom cluster name
openframe bootstrap my-cluster

# Bootstrap with verbose output
openframe bootstrap --verbose
```

### Production Setup

```bash
# Create production environment
openframe bootstrap prod-cluster

# Verify installation
openframe cluster status prod-cluster
kubectl get applications -n argocd
```

### Development Environment

```bash
# Quick development setup
openframe bootstrap dev

# Check everything is running
openframe cluster list
kubectl get pods --all-namespaces
```

## Bootstrap Process

### Step 1: Cluster Creation

```
Creating Kubernetes Cluster
────────────────────────────────────────────────────────────
✓ Creating cluster "my-cluster"...
  • Type: k3d
  • Kubernetes: v1.31.5-k3s1
  • Nodes: 1 control-plane, 3 workers
✓ Cluster created successfully
✓ Kubeconfig updated
```

### Step 2: Chart Installation

```
Installing ArgoCD and Applications
────────────────────────────────────────────────────────────
✓ Prerequisites verified
✓ Certificates generated
✓ ArgoCD installed (v8.1.4)
✓ App-of-apps deployed
```

### Step 3: Completion

```
Bootstrap Complete!
────────────────────────────────────────────────────────────

Environment "my-cluster" is ready:
  • Cluster: Running (4 nodes)
  • ArgoCD: Deployed
  • Applications: Syncing

Access ArgoCD UI:
  URL: https://localhost/argocd
  Username: admin
  Password: kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d

Next steps:
  1. Monitor applications: kubectl get applications -n argocd
  2. Check cluster status: openframe cluster status my-cluster
  3. View pods: kubectl get pods --all-namespaces
```

## Default Configuration

Bootstrap uses these defaults:

### Cluster Configuration
- **Type**: k3d (local Kubernetes)
- **Nodes**: 3 workers + 1 control plane
- **Kubernetes Version**: v1.31.5-k3s1
- **Port Mappings**: 80, 443, 6550

### Chart Configuration
- **ArgoCD Version**: 8.1.4
- **GitHub Repository**: https://github.com/Flamingo-CX/openframe
- **Branch**: main
- **Namespace**: argocd

## Exit Codes

- `0` - Bootstrap completed successfully
- `1` - Bootstrap failed
- `2` - Prerequisites not met
- `3` - Cluster creation failed
- `4` - Chart installation failed
- `130` - User cancelled (Ctrl+C)

## Prerequisites

Bootstrap automatically checks for:

1. **Docker** - Must be running
2. **kubectl** - Must be installed
3. **k3d** - Required for cluster creation
4. **Helm** - Required for chart installation
5. **Git** - Required for repository operations

If prerequisites are missing, bootstrap will fail with instructions on what to install.

## Comparison with Individual Commands

### Bootstrap (Recommended for Quick Start)

```bash
# Single command, default configuration
openframe bootstrap my-cluster
```

**Pros:**
- Simple one-command setup
- Automatic flow between steps
- Best for getting started quickly
- Consistent configuration

**Cons:**
- Limited customization options
- Uses all defaults
- Cannot skip steps

### Individual Commands (Advanced Usage)

```bash
# Separate commands with customization
openframe cluster create my-cluster --nodes 5 --version v1.30.0-k3s1
openframe chart install my-cluster --github-branch develop
```

**Pros:**
- Full control over each step
- Can customize all options
- Can run steps independently
- Can use existing clusters

**Cons:**
- More complex
- Requires understanding of options
- Multiple commands to manage

## Post-Bootstrap Tasks

### Verify Installation

```bash
# Check cluster
openframe cluster status

# Verify ArgoCD
kubectl get pods -n argocd

# List applications
kubectl get applications -n argocd
```

### Access ArgoCD UI

```bash
# Get admin password
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d

# Access UI (if ingress configured)
open https://localhost/argocd

# Or port-forward
kubectl port-forward svc/argocd-server -n argocd 8080:443
open https://localhost:8080
```

### Monitor Applications

```bash
# Watch application sync status
watch kubectl get applications -n argocd

# Check for issues
kubectl get applications -n argocd -o json | jq '.items[] | select(.status.sync.status != "Synced")'
```

## Cleanup

To remove everything created by bootstrap:

```bash
# Delete the cluster (includes all resources)
openframe cluster delete my-cluster

# Or force delete without confirmation
openframe cluster delete my-cluster --force
```

## Troubleshooting

### Common Issues

**Bootstrap hangs at cluster creation**
```bash
# Check Docker
docker info

# Try creating cluster manually
openframe cluster create test --verbose
```

**Chart installation fails**
```bash
# Check cluster is running
openframe cluster status

# Verify kubectl access
kubectl get nodes

# Try installing charts manually
openframe chart install --verbose
```

**Out of resources**
```bash
# Check Docker resources
docker system df

# Clean up and retry
docker system prune -a --volumes
openframe bootstrap
```

## Use Cases

### Development Environment

```bash
# Morning setup
openframe bootstrap dev
# Work on your code...
# Evening cleanup
openframe cluster delete dev --force
```

### Demo Environment

```bash
# Quick demo setup
openframe bootstrap demo
# Show ArgoCD and applications
# Clean up after demo
openframe cluster delete demo --force
```

### Testing CI/CD

```bash
# Create test environment
openframe bootstrap ci-test
# Run tests...
# Teardown
openframe cluster delete ci-test --force
```

## Best Practices

1. **Use bootstrap for new environments** - Simplest way to get started
2. **Name clusters purposefully** - Use descriptive names like `dev`, `test`, `demo`
3. **Clean up regularly** - Delete unused clusters to free resources
4. **Monitor resources** - Check Docker disk usage periodically
5. **Document customizations** - If you need custom settings, document them

## Limitations

- Cannot customize cluster or chart settings
- Cannot use existing clusters
- Cannot skip steps
- Always uses default GitHub repository and branch
- Requires all prerequisites to be installed

For advanced configurations, use the individual `cluster create` and `chart install` commands.

## See Also

- [cluster create](../cluster/create.md) - Detailed cluster creation
- [chart install](../chart/install.md) - Detailed chart installation
- [cluster status](../cluster/status.md) - Check environment health
- [cluster delete](../cluster/delete.md) - Clean up resources

## Notes

- Bootstrap is idempotent - safe to run multiple times (will recreate cluster)
- Each bootstrap creates a fresh environment
- All resources are contained within the cluster
- GitHub credentials may be required for private repositories
- The process takes approximately 2-5 minutes depending on system performance