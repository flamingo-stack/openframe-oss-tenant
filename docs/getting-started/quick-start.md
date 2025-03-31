# Quick Start Guide

This guide will help you get OpenFrame up and running quickly on Kubernetes.

## Prerequisites

- Kubernetes cluster (version 1.20 or later)
- Helm 3.x installed
- `kubectl` configured to access your cluster
- Sufficient cluster resources:
  - Minimum 4 nodes
  - 16GB RAM per node
  - 100GB storage per node
- A modern web browser

## Quick Installation

1. Add the OpenFrame Helm repository:
   ```bash
   helm repo add openframe https://your-org.github.io/openframe/charts
   helm repo update
   ```

2. Create a namespace for OpenFrame:
   ```bash
   kubectl create namespace openframe
   ```

3. Deploy OpenFrame using Helm:
   ```bash
   helm install openframe openframe/openframe \
     --namespace openframe \
     --set global.domain=your-domain.com \
     --set global.storageClass=standard
   ```

4. Access the web interface:
   - Get the service URL:
     ```bash
     kubectl get ingress -n openframe
     ```
   - Default credentials:
     - Username: `admin`
     - Password: `admin` (change this immediately)

## Initial Configuration

1. Change the default admin password
2. Configure your first monitoring target
3. Set up basic alerts

## Basic Usage

### Adding a Device

1. Navigate to the Devices section
2. Click "Add New Device"
3. Follow the wizard to add your first device

### Setting Up Monitoring

1. Select a device
2. Choose monitoring metrics
3. Configure alert thresholds

### Creating Reports

1. Go to the Reports section
2. Select a report template
3. Configure report parameters
4. Generate your first report

## Next Steps

- Review the [Installation Guide](installation.md) for detailed setup instructions
- Check the [Configuration Guide](configuration.md) for advanced settings
- Read the [System Architecture](architecture/system-architecture.md) to understand the platform better
- Review the [Kubernetes Deployment Guide](../deployment/kubernetes.md)

## Troubleshooting

If you encounter issues:

1. Check pod status:
   ```bash
   kubectl get pods -n openframe
   ```

2. View logs:
   ```bash
   kubectl logs -f deployment/api-gateway -n openframe
   ```

3. Check service status:
   ```bash
   kubectl get services -n openframe
   ```

4. Review the [Troubleshooting Guide](../operations/troubleshooting.md)

## Getting Help

- Check our [GitHub Issues](https://github.com/your-org/openframe/issues)
- Join our community discussions
- Contact support 