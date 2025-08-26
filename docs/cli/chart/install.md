# chart install

Install ArgoCD and app-of-apps pattern on a Kubernetes cluster.

## Synopsis

```bash
openframe chart install [cluster-name] [flags]
```

## Description

Installs ArgoCD (v8.1.4) with custom configuration and deploys the app-of-apps pattern from a GitHub repository. This establishes a GitOps workflow for managing all OpenFrame applications.

The installation includes:
- ArgoCD deployment with web UI
- Self-signed certificates generation
- GitHub repository integration
- App-of-apps root application
- Automatic synchronization of child applications

## Arguments

| Argument | Description | Required |
|----------|-------------|----------|
| `cluster-name` | Target cluster for installation | No (uses current context) |

## Flags

| Flag | Short | Description | Default |
|------|-------|-------------|---------|
| `--force` | `-f` | Force installation even if charts exist | `false` |
| `--dry-run` | - | Preview installation without executing | `false` |
| `--github-repo` | - | GitHub repository URL | `https://github.com/Flamingo-CX/openframe` |
| `--github-branch` | - | Repository branch to use | `main` |
| `--github-username` | - | GitHub username | (prompts if needed) |
| `--github-token` | - | GitHub Personal Access Token | (prompts if needed) |
| `--cert-dir` | - | Certificate directory path | (auto-detected) |
| `--verbose` | `-v` | Enable verbose output | `false` |
| `--silent` | - | Suppress output except errors | `false` |

## Installation Steps

### 1. Prerequisites Check

```
✓ Checking prerequisites...
  • Helm: installed (v3.12.0)
  • kubectl: configured
  • Git: available
  • Cluster: my-cluster (running)
```

### 2. Certificate Generation

```
✓ Generating certificates...
  • Directory: /Users/username/main/job/flamingo/projects/openframe/certs
  • Creating self-signed certificates
  • Storing ca.crt, tls.crt, tls.key
```

### 3. GitHub Authentication

If credentials not provided via flags:

```
GitHub Authentication Required
Username: myusername
Personal Access Token: **********************
✓ Authentication successful
```

### 4. ArgoCD Installation

```
✓ Installing ArgoCD...
  • Namespace: argocd
  • Version: 8.1.4
  • Applying custom values
  • Waiting for pods to be ready...
```

### 5. App-of-Apps Deployment

```
✓ Deploying app-of-apps...
  • Repository: https://github.com/Flamingo-CX/openframe
  • Branch: main
  • Path: /manifests
  • Creating root application
```

## Examples

### Basic Installation

```bash
# Install on current cluster context
openframe chart install

# Install on specific cluster
openframe chart install my-cluster
```

### Custom Repository

```bash
# Use different repository
openframe chart install \
  --github-repo https://github.com/myorg/myrepo

# Use development branch
openframe chart install \
  --github-branch develop
```

### Automated Installation

```bash
# Provide all credentials (no prompts)
openframe chart install my-cluster \
  --github-username myuser \
  --github-token ghp_xxxxxxxxxxxx \
  --github-branch main

# Force reinstall
openframe chart install --force
```

### Dry Run

```bash
# Preview what would be installed
openframe chart install --dry-run

# Dry run with custom settings
openframe chart install my-cluster \
  --github-branch develop \
  --dry-run
```

### Custom Certificates

```bash
# Use existing certificates
openframe chart install \
  --cert-dir /path/to/existing/certs

# Generate in specific location
openframe chart install \
  --cert-dir /custom/cert/location
```

## Output

### Success Output

```
OpenFrame Chart Installation
────────────────────────────────────────────────────────────

✓ Prerequisites verified
✓ Certificates generated
✓ GitHub authenticated
✓ ArgoCD installed successfully
✓ App-of-apps deployed

Installation completed successfully!

ArgoCD Details:
  URL: https://localhost:443/argocd
  Username: admin
  Password: (retrieve with: kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d)

Next Steps:
  1. Access ArgoCD UI at https://localhost/argocd
  2. Monitor application sync status
  3. Check deployed applications: kubectl get applications -n argocd
```

### Dry Run Output

```
DRY RUN MODE - No changes will be made

Would perform the following actions:
  1. Generate certificates in: /Users/username/.../certs
  2. Install ArgoCD v8.1.4 in namespace: argocd
  3. Configure GitHub repository:
     - URL: https://github.com/Flamingo-CX/openframe
     - Branch: main
  4. Deploy app-of-apps from: /manifests
  5. Create ArgoCD applications for:
     - Infrastructure components
     - Monitoring stack
     - OpenFrame services
```

## GitHub Token Requirements

The GitHub Personal Access Token needs these permissions:
- `repo` - Full control of private repositories
- `read:packages` - Read packages (if using GitHub Packages)

Create a token at: https://github.com/settings/tokens

## Certificate Management

### Auto-Generated Certificates

By default, certificates are generated in:
- macOS/Linux: `~/main/job/flamingo/projects/openframe/certs`
- Custom: Specified by `--cert-dir`

### Certificate Files

| File | Description |
|------|-------------|
| `ca.crt` | Certificate Authority certificate |
| `tls.crt` | Server TLS certificate |
| `tls.key` | Server TLS private key |

### Using Existing Certificates

Place your certificates in a directory and use:

```bash
openframe chart install --cert-dir /path/to/certs
```

## Post-Installation

### Access ArgoCD UI

```bash
# Get admin password
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d

# Port forward (if no ingress)
kubectl port-forward svc/argocd-server -n argocd 8080:443

# Access UI
open https://localhost:8080
```

### Verify Installation

```bash
# Check ArgoCD pods
kubectl get pods -n argocd

# List applications
kubectl get applications -n argocd

# Check sync status
kubectl get applications -n argocd -o wide
```

### Monitor Applications

```bash
# Watch application sync
watch kubectl get applications -n argocd

# Check application details
kubectl describe application app-of-apps -n argocd

# View logs
kubectl logs -n argocd deployment/argocd-server
```

## Troubleshooting

### Common Issues

**Cluster not found**
```bash
# List available clusters
openframe cluster list

# Set kubectl context
kubectl config use-context k3d-my-cluster
```

**GitHub authentication failed**
```bash
# Verify token permissions
curl -H "Authorization: token YOUR_TOKEN" \
  https://api.github.com/user/repos

# Test repository access
git ls-remote https://USERNAME:TOKEN@github.com/ORG/REPO
```

**ArgoCD pods not starting**
```bash
# Check pod events
kubectl describe pods -n argocd

# Check resource availability
kubectl top nodes

# View detailed logs
kubectl logs -n argocd -l app.kubernetes.io/name=argocd-server --tail=50
```

**Certificate issues**
```bash
# Regenerate certificates
rm -rf /path/to/cert-dir
openframe chart install --force

# Verify certificates
openssl x509 -in /path/to/cert-dir/tls.crt -text -noout
```

## Uninstalling

To remove ArgoCD and applications:

```bash
# Delete applications first
kubectl delete applications --all -n argocd

# Uninstall ArgoCD
helm uninstall argocd -n argocd

# Remove namespace
kubectl delete namespace argocd

# Clean up certificates (optional)
rm -rf ~/main/job/flamingo/projects/openframe/certs
```

## Exit Codes

- `0` - Installation successful
- `1` - Installation failed
- `2` - Prerequisites not met
- `3` - Cluster not available
- `4` - Authentication failed
- `130` - User cancelled (Ctrl+C)

## See Also

- [chart](README.md) - Chart command overview
- [cluster create](../cluster/create.md) - Create a cluster first
- [bootstrap](../bootstrap/README.md) - Combined cluster + chart installation

## Notes

- Installation is idempotent unless `--force` is used
- Certificates are reused if they exist unless `--force` is specified
- GitHub credentials are only used during installation, not stored
- ArgoCD continuously syncs from the configured repository
- All applications follow GitOps principles after installation