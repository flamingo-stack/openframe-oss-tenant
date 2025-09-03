# OpenFrame CLI Documentation

Comprehensive documentation for the OpenFrame CLI tool.

## Quick Navigation

### Getting Started
- [Installation](installation.md) - Install and build the CLI
- [Prerequisites](prerequisites.md) - System requirements
- [Quick Start](quick-start.md) - Get up and running fast

### Command Reference
- [cluster](cluster/) - Manage Kubernetes clusters
  - [create](cluster/create.md) - Create a new cluster
  - [delete](cluster/delete.md) - Delete a cluster
  - [list](cluster/list.md) - List all clusters
  - [status](cluster/status.md) - Show cluster status
  - [cleanup](cluster/cleanup.md) - Clean up resources
- [chart](chart/) - Manage Helm charts
  - [install](chart/install.md) - Install ArgoCD and apps
- [dev](dev/) - Development tools for local workflows
  - [intercept](dev/intercept.md) - Intercept traffic to local development
  - [skaffold](dev/skaffold.md) - Live development with hot reloading
- [bootstrap](bootstrap/) - One-command complete setup

### Guides
- [Interactive Wizard](guides/interactive-wizard.md) - Using the cluster creation wizard
- [Migration from Scripts](guides/migration-from-scripts.md) - Moving from shell scripts
- [Troubleshooting](troubleshooting.md) - Common issues and solutions

## Overview

The OpenFrame CLI is a modern command-line tool designed to simplify Kubernetes cluster management and OpenFrame deployment. It replaces traditional shell scripts with an interactive, user-friendly interface while maintaining powerful automation capabilities.

## Key Features

- 🎯 **Interactive Wizards** - Guided setup with intelligent defaults
- ⚡ **Quick Commands** - Fast cluster operations with minimal typing
- 🔧 **Smart Detection** - Automatic system resource configuration
- 📊 **Rich Output** - Clear, formatted output with progress indicators
- 🛠 **Developer Friendly** - Verbose modes, dry runs, and automation support

## Command Structure

```
openframe [command] [subcommand] [arguments] [flags]
```

### Command Hierarchy

```
openframe
├── cluster          # Cluster management
│   ├── create      # Create new cluster
│   ├── delete      # Delete cluster
│   ├── list        # List clusters
│   ├── status      # Show status
│   └── cleanup     # Clean resources
├── chart           # Chart management
│   └── install     # Install ArgoCD
├── dev             # Development tools
│   ├── intercept   # Traffic interception
│   └── skaffold    # Live development
└── bootstrap       # Complete setup
```

## Global Flags

Available across all commands:

| Flag | Short | Description |
|------|-------|-------------|
| `--verbose` | `-v` | Enable detailed output |
| `--silent` | - | Suppress output except errors |
| `--version` | - | Show CLI version |
| `--help` | `-h` | Show help information |

## Common Workflows

### New User Quick Start

```bash
# One command to set everything up
openframe bootstrap

# Access your environment
kubectl get pods --all-namespaces
```

### Development Workflow

```bash
# Morning: Create environment
openframe cluster create dev
openframe chart install dev

# Start live development
openframe dev skaffold dev

# In another terminal, intercept services for local debugging
openframe dev intercept api-service --port 8080

# Evening: Clean up
openframe cluster cleanup dev
openframe cluster delete dev
```

### Production Setup

```bash
# Create production cluster
openframe cluster create prod --nodes 5

# Install with custom configuration
openframe chart install prod \
  --github-branch production \
  --github-repo https://github.com/myorg/config

# Monitor status
openframe cluster status prod --detailed
```

## Interactive vs Non-Interactive

The CLI supports both interactive and non-interactive modes:

### Interactive Mode (Default)

Perfect for learning and exploration:
- Step-by-step wizards
- Confirmation prompts
- Selection menus
- Progress indicators

### Non-Interactive Mode

Ideal for automation and scripts:
- Use `--force` to skip confirmations
- Use `--silent` to suppress output
- Provide all parameters via flags
- Check exit codes for success/failure

## Architecture

The CLI follows a modular architecture:

```
CLI Layer (Cobra Commands)
    ↓
Service Layer (Business Logic)
    ↓
Provider Layer (K3d, Helm, Git)
    ↓
System Layer (Docker, Kubernetes)
```

## Best Practices

1. **Start with Bootstrap** - Use `openframe bootstrap` for initial setup
2. **Use Interactive Mode** - When learning or exploring options
3. **Name Clusters Clearly** - Use descriptive names like `dev`, `test`, `prod`
4. **Regular Cleanup** - Run `cluster cleanup` to free disk space
5. **Check Status** - Use `cluster status` to verify health
6. **Use Dry Run** - Test commands with `--dry-run` before execution

## Exit Codes

Standard exit codes across all commands:

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 2 | Prerequisites not met |
| 3 | Resource already exists |
| 4 | Resource not found |
| 130 | User cancelled (Ctrl+C) |

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `KUBECONFIG` | Kubernetes config file | `~/.kube/config` |
| `GITHUB_TOKEN` | GitHub authentication | - |
| `GITHUB_USERNAME` | GitHub username | - |
| `OPENFRAME_CLUSTER_TYPE` | Default cluster type | `k3d` |
| `OPENFRAME_CERT_DIR` | Certificate directory | Auto-detected |

## Getting Help

### Built-in Help

```bash
# General help
openframe --help

# Command help
openframe cluster --help

# Subcommand help
openframe cluster create --help
```

### Documentation

- This documentation: `/docs/cli/`
- GitHub Issues: Report bugs and feature requests
- Community Forum: Ask questions and share tips

## Version Information

Check your CLI version:

```bash
openframe --version
```

Output format:
```
dev (none) built on unknown
```

Production builds show:
```
v1.0.0 (abc1234) built on 2024-01-15
```

## Contributing

The CLI is open source and welcomes contributions:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

The OpenFrame CLI is part of the OpenFrame project and follows the same licensing terms.

## See Also

- [Installation Guide](installation.md)
- [Prerequisites](prerequisites.md)
- [Quick Start Guide](quick-start.md)
- [Troubleshooting](troubleshooting.md)