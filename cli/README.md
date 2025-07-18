# OpenFrame CLI

A command-line interface for managing OpenFrame platform development workflows.

## Features

- **Dev Mode**: Start services in development mode with Skaffold
- **Intercept Mode**: Create Telepresence intercepts for local development
- **Service Discovery**: List and manage available services
- **Status Monitoring**: Check system health and dependencies

## Installation

### From Source
```bash
git clone <repository-url>
cd openframe/cli
make build
```

### Using Go
```bash
go install openframe/cli@latest
```

## Usage

### Development Mode
```bash
# Start a service in development mode
openframe dev openframe-api

# With options
openframe dev openframe-ui --tail --port-forward
```

### Intercept Mode
```bash
# Create an intercept
openframe intercept openframe-api 8080 8080

# With mount
openframe intercept openframe-ui 3000 80 --mount
```

### Service Discovery
```bash
# List all services
openframe list

# List with details
openframe list --detailed
```

### System Status
```bash
# Check system status
openframe status

# Detailed status with health checks
openframe status --detailed --health
```

## Available Services

**Microservices**: `openframe-api`, `openframe-gateway`, `openframe-client`, `openframe-config`, `openframe-management`, `openframe-stream`, `openframe-ui`, `external-api`

**Integrated Tools**: `meshcentral`, `tactical-rmm`, `fleetmdm`, `authentik`

## Configuration

Create `.openframe/config.json` for custom settings:

```json
{
  "settings": {
    "defaultNamespace": "microservices",
    "telepresence": {
      "autoConnect": true
    },
    "skaffold": {
      "portForward": true,
      "tail": true
    }
  }
}
```

## Development

```bash
# Build
make build

# Test
make test

# Clean
make clean
```

## Troubleshooting

### Common Issues

1. **Service Not Found**: Ensure you're in the OpenFrame project root
2. **Telepresence Not Connected**: Run `telepresence connect` manually
3. **Port Already in Use**: Use a different port or check what's using it with `lsof -i :PORT`

### Debug Mode
```bash
openframe --verbose dev openframe-api
``` 