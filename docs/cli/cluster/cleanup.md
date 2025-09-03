# cluster cleanup

Clean up unused cluster resources to free disk space.

## Synopsis

```bash
openframe cluster cleanup [NAME] [flags]
openframe cluster c [NAME] [flags]  # Using alias
```

## Description

Removes unused Docker images, volumes, and other resources from cluster nodes. Useful for development clusters that accumulate build artifacts and cached images over time. Does not delete the cluster itself.

## Arguments

| Argument | Description | Required |
|----------|-------------|----------|
| `NAME` | Cluster name to clean | No (interactive if omitted) |

## Aliases

The cleanup subcommand can be invoked using:
- `openframe cluster cleanup`
- `openframe cluster c`

## Flags

| Flag | Short | Description | Default |
|------|-------|-------------|---------|
| `--force` | `-f` | Enable aggressive cleanup (removes all unused resources) | `false` |
| `--dry-run` | - | Show what would be cleaned | `false` |
| `--verbose` | `-v` | Enable verbose output | `false` |
| `--silent` | - | Suppress all output except errors | `false` |

## Interactive Selection

When no cluster name is provided:

```
Select a cluster to cleanup:
  > my-cluster     (k3d, 4 nodes)
    dev-cluster    (k3d, 2 nodes)
    test-cluster   (k3d, 3 nodes)

Use arrow keys to navigate, Enter to select, Ctrl+C to cancel
```

## Cleanup Modes

### Standard Cleanup (default)

Removes:
- Dangling images (untagged)
- Stopped containers from the cluster
- Unused volumes created by the cluster
- Build cache older than 24 hours

### Aggressive Cleanup (`--force`)

Additionally removes:
- All unused images (not just dangling)
- All unused volumes (system-wide)
- All unused networks
- All build cache
- Orphaned containers

## Examples

### Basic Usage

```bash
# Clean specific cluster
openframe cluster cleanup my-cluster

# Interactive selection
openframe cluster cleanup

# Using alias
openframe cluster c my-cluster
```

### Aggressive Cleanup

```bash
# Remove all unused resources
openframe cluster cleanup my-cluster --force

# Short flag
openframe cluster cleanup my-cluster -f
```

### Dry Run

```bash
# Preview what would be cleaned
openframe cluster cleanup my-cluster --dry-run

# Dry run with force to see aggressive cleanup
openframe cluster cleanup my-cluster --dry-run --force
```

### Automated Cleanup

```bash
# Silent cleanup in scripts
openframe cluster cleanup my-cluster --force --silent

# Cleanup all clusters
for cluster in $(openframe cluster list -q); do
    openframe cluster cleanup "$cluster" --force
done
```

### Verbose Output

```bash
# See detailed cleanup process
openframe cluster cleanup my-cluster --verbose
```

## Output

### Standard Output

```
? Are you sure you want to cleanup cluster "my-cluster"? Yes

⠋ Cleaning up cluster "my-cluster"...
  • Removing dangling images...
  • Cleaning stopped containers...
  • Removing unused volumes...
  • Clearing build cache...

✓ Cleanup completed for cluster "my-cluster"
  
Space reclaimed: 2.3 GB
  Images removed: 12
  Containers removed: 5
  Volumes removed: 3
```

### Dry Run Output

```
Would cleanup cluster "my-cluster":

IMAGES TO REMOVE (1.2 GB):
  - <none>:<none> (500 MB)
  - old/app:v1.0.0 (400 MB)
  - test/image:latest (300 MB)

CONTAINERS TO REMOVE (100 MB):
  - exited_container_1 (50 MB)
  - exited_container_2 (50 MB)

VOLUMES TO REMOVE (1.0 GB):
  - unused_volume_1 (500 MB)
  - unused_volume_2 (500 MB)

BUILD CACHE TO CLEAR: 500 MB

Total space to reclaim: 2.8 GB
```

### Verbose Output

```
[DEBUG] Detecting cluster type: k3d
[DEBUG] Getting cluster nodes...
[DEBUG] Found 4 nodes for cluster my-cluster
[DEBUG] Executing: docker image prune -f
[DEBUG] Removed image: sha256:abc123... (123 MB)
[DEBUG] Executing: docker container prune -f
[DEBUG] Removed container: old_container_1
[DEBUG] Executing: docker volume prune -f
[DEBUG] Removed volume: unused_volume_1
[DEBUG] Build cache cleared: 500 MB
[INFO] Cleanup completed successfully
```

## Resource Types Cleaned

### Images

| Type | Standard | Force |
|------|----------|-------|
| Dangling (untagged) | ✓ | ✓ |
| Unused tagged images | ✗ | ✓ |
| Intermediate build layers | ✓ | ✓ |

### Containers

| Type | Standard | Force |
|------|----------|-------|
| Exited containers | ✓ | ✓ |
| Created but not started | ✓ | ✓ |
| Dead containers | ✓ | ✓ |

### Volumes

| Type | Standard | Force |
|------|----------|-------|
| Cluster-specific unused | ✓ | ✓ |
| All unused volumes | ✗ | ✓ |
| Anonymous volumes | ✓ | ✓ |

### Networks

| Type | Standard | Force |
|------|----------|-------|
| Unused custom networks | ✗ | ✓ |
| Default networks | ✗ | ✗ |

## Safety Features

- Confirmation prompt by default
- Never removes running containers
- Preserves cluster's active resources
- Default mode is conservative
- Dry run shows preview without changes

## Exit Codes

- `0` - Cleanup completed successfully
- `1` - Cleanup failed
- `4` - Cluster not found
- `130` - User cancelled (Ctrl+C or answered No)

## Performance Impact

Cleanup operations may temporarily affect:
- Disk I/O during deletion
- Docker daemon responsiveness
- First container start after image cleanup (needs re-pull)

## Best Practices

### Regular Maintenance

```bash
# Weekly cleanup for development clusters
0 2 * * 0 openframe cluster cleanup dev-cluster --force --silent
```

### Before Major Operations

```bash
# Clean before updating cluster
openframe cluster cleanup my-cluster
openframe cluster delete my-cluster
openframe cluster create my-cluster
```

### Space Monitoring

```bash
# Check space before and after
df -h /var/lib/docker
openframe cluster cleanup my-cluster
df -h /var/lib/docker
```

## Troubleshooting

### Common Issues

**Cleanup hangs**
```bash
# Check Docker daemon
docker info

# Try manual Docker cleanup
docker system prune -a --volumes
```

**No space reclaimed**
```bash
# Check what's using space
docker system df

# Use force mode
openframe cluster cleanup my-cluster --force

# Verify with verbose
openframe cluster cleanup my-cluster --verbose
```

**Permission denied**
```bash
# May need elevated permissions
sudo openframe cluster cleanup my-cluster
```

## See Also

- [cluster](README.md) - Cluster command overview
- [cluster delete](delete.md) - Delete entire cluster
- [cluster list](list.md) - List all clusters
- [cluster status](status.md) - Check cluster health

## Notes

- Cleanup is safe for running clusters - only removes unused resources
- Force mode is more aggressive but still preserves active resources
- Regular cleanup prevents disk space issues in development
- The command works with all cluster types that use Docker