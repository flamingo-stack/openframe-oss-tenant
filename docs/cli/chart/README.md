# chart

Manage Helm charts and ArgoCD installation for OpenFrame.

## Synopsis

```bash
openframe chart [command] [flags]
openframe chart [command] [flags] [arguments]
```

## Description

The `chart` command group provides ArgoCD and app-of-apps pattern installation functionality. It manages the deployment of ArgoCD and OpenFrame applications using Helm charts and GitOps principles.

## Available Commands

| Command | Description |
|---------|-------------|
| `install` | Install ArgoCD and app-of-apps on a cluster |

## Command Aliases

The chart command itself can be invoked using:
- `openframe chart`
- `openframe c`

## Prerequisites

Before using chart commands:

1. **Existing Cluster** - Must have a running cluster created with `openframe cluster create`
2. **kubectl** - Configured with cluster context
3. **Helm** - Installed for chart management
4. **Git** - For repository operations
5. **GitHub Access** - Personal Access Token for private repositories

## Global Flags

These flags are inherited from the root command:

| Flag | Short | Description | Default |
|------|-------|-------------|---------|
| `--verbose` | `-v` | Enable verbose output | `false` |
| `--silent` | - | Suppress all output except errors | `false` |

## Architecture Overview

The chart installation follows the app-of-apps pattern:

```
ArgoCD (Helm Chart)
  └── App-of-Apps (Git Repository)
      ├── Infrastructure Apps
      ├── Monitoring Stack
      ├── Security Tools
      └── OpenFrame Services
```

## Examples

### Basic Installation

```bash
# Install ArgoCD with defaults
openframe chart install

# Install on specific cluster
openframe chart install my-cluster
```

### Custom Configuration

```bash
# Use different GitHub branch
openframe chart install --github-branch develop

# Custom certificate directory
openframe chart install --cert-dir /path/to/certs

# Provide credentials upfront
openframe chart install \
  --github-username myuser \
  --github-token ghp_xxxxxxxxxxxx
```

### Advanced Usage

```bash
# Dry run to preview
openframe chart install --dry-run

# Force reinstall
openframe chart install --force

# Verbose output for debugging
openframe chart install --verbose
```

## Installation Process

The chart installation performs these steps:

1. **Prerequisites Check**
   - Verify cluster exists and is running
   - Check Helm installation
   - Validate kubectl connectivity

2. **Certificate Generation**
   - Generate self-signed certificates
   - Store in cert directory

3. **ArgoCD Installation**
   - Deploy ArgoCD via Helm (v8.1.4)
   - Configure with custom values
   - Wait for pods to be ready

4. **App-of-Apps Setup**
   - Clone GitHub repository
   - Configure branch and credentials
   - Deploy root application

5. **Synchronization**
   - ArgoCD syncs all child applications
   - Monitor deployment status

## Configuration

### Default Values

| Setting | Default | Description |
|---------|---------|-------------|
| ArgoCD Version | 8.1.4 | ArgoCD Helm chart version |
| Namespace | argocd | ArgoCD namespace |
| GitHub Repo | https://github.com/flamingo-stack/openframe-oss-tenant | Repository URL |
| GitHub Branch | main | Repository branch |
| Cert Directory | Auto-detected | Certificate storage location |

### Custom Values

You can customize the installation by:
- Providing custom Helm values file
- Setting GitHub repository and branch
- Configuring certificate directory
- Supplying GitHub credentials

## GitOps Workflow

After installation, ArgoCD manages applications via GitOps:

1. **Source of Truth** - GitHub repository defines desired state
2. **Continuous Sync** - ArgoCD monitors and applies changes
3. **Self-Healing** - Automatically corrects drift
4. **Declarative Config** - All configuration in Git

## Exit Codes

- `0` - Installation successful
- `1` - Installation failed
- `2` - Prerequisites not met
- `3` - Cluster not found or not running
- `130` - User cancelled (Ctrl+C)

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GITHUB_TOKEN` | GitHub Personal Access Token | - |
| `GITHUB_USERNAME` | GitHub username | - |
| `OPENFRAME_CERT_DIR` | Certificate directory | Auto-detected |

## Troubleshooting

### Common Issues

**Cluster not found**
```bash
# Verify cluster exists
openframe cluster list

# Check cluster status
openframe cluster status my-cluster
```

**GitHub authentication failed**
```bash
# Ensure token has repo access
# Create token at: https://github.com/settings/tokens

# Test access
git ls-remote https://username:token@github.com/org/repo
```

**ArgoCD pods not starting**
```bash
# Check pod status
kubectl get pods -n argocd

# View logs
kubectl logs -n argocd deployment/argocd-server
```

## Security Considerations

- GitHub tokens are never stored on disk
- Certificates are generated per installation
- ArgoCD uses TLS for all communications
- Credentials are stored as Kubernetes secrets

## See Also

- [chart install](install.md) - Detailed install documentation
- [cluster create](../cluster/create.md) - Create a cluster first
- [bootstrap](../bootstrap/README.md) - One-command setup

## Notes

- Chart commands require an existing cluster
- Installation is idempotent - safe to run multiple times
- ArgoCD UI is accessible after installation at the cluster's ingress
- All applications are managed declaratively via Git