# First Steps with OpenFrame

Congratulations on successfully setting up OpenFrame! This guide will walk you through your first hour with the platform, helping you understand its key features and capabilities.

## Initial Access

### Accessing the Dashboard

1. **Open your browser** and navigate to: http://localhost:8080
2. **Login** using the default credentials (if authentication is enabled)
3. **Explore the main dashboard** - your central hub for all operations

### Key Interface Elements

- **Navigation Bar**: Quick access to major sections
- **Dashboard Widgets**: Real-time metrics and status indicators  
- **Service Status Panel**: Monitor all integrated services
- **Quick Actions**: Common tasks and shortcuts

## Understanding the Architecture

### Core Components Overview

OpenFrame consists of several interconnected services:

1. **Gateway Service** (Port 8080) - Your main entry point
2. **API Service** - GraphQL and REST endpoints
3. **Client Service** - Agent management
4. **Management Service** - Administrative functions
5. **Stream Service** - Real-time data processing
6. **Config Service** (Port 8888) - Configuration management
7. **UI Service** - Vue.js frontend application

### Data Flow
```
User Request → Gateway → Service → Database → Response
```

## Exploring Key Features

### 1. Service Management

**View Service Status**:
- Navigate to the Services section
- Check health status of all components
- Review performance metrics

**Service Controls**:
- Start/stop individual services
- View service logs
- Monitor resource usage

### 2. API Exploration

**GraphQL Playground**:
1. Visit: http://localhost:8080/graphql
2. Explore available queries and mutations
3. Try sample queries:

```graphql
query {
  systemInfo {
    version
    status
    services {
      name
      status
      port
    }
  }
}
```

**REST Endpoints**:
- Authentication: `/oauth/token`
- Health checks: `/actuator/health`
- Service discovery: `/api/services`

### 3. Integrated Tools

OpenFrame includes several integrated tools:

**Currently Available**:
- **MeshCentral** - Remote management platform
- **Tactical RMM** - IT management suite  
- **Fleet MDM** - Mobile device management
- **Authentik** - Identity provider

**Accessing Tools**:
1. From the main dashboard, click on "Integrated Tools"
2. Select the tool you want to use
3. Tools open in embedded views or new tabs

### 4. Agent Management

**Understanding Agents**:
- Cross-platform Rust agents for system monitoring
- Automatic registration and management
- Real-time metrics collection

**Agent Operations**:
1. View registered agents in the Client section
2. Monitor agent health and connectivity
3. Deploy configuration updates
4. Review collected metrics

## Common First Tasks

### 1. Configure Your Environment

**Update Configuration**:
1. Access the Config Service at http://localhost:8888
2. Review default settings
3. Customize for your environment

**Environment Variables**:
```bash
# Key environment variables to consider
SPRING_PROFILES_ACTIVE=dev
SERVER_PORT=8080
DATABASE_URL=mongodb://localhost:27017/openframe
```

### 2. Set Up Monitoring

**Dashboard Setup**:
1. Navigate to Monitoring section
2. Configure alert thresholds
3. Set up notification channels

**Grafana Access** (if enabled):
- URL: http://localhost:3000
- Default credentials: admin/admin
- Pre-configured OpenFrame dashboards

### 3. Test API Integration

**Using curl**:
```bash
# Get system status
curl -X GET http://localhost:8080/api/system/status

# Test authentication
curl -X POST http://localhost:8080/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id=your_client_id&client_secret=your_secret"
```

**Using GraphQL**:
```bash
# Test GraphQL endpoint
curl -X POST http://localhost:8080/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ systemInfo { version status } }"}'
```

## Development Workflow

### 1. Making Your First Change

**Frontend Changes**:
1. Navigate to `openframe/services/openframe-frontend`
2. Run `npm run dev` for development mode
3. Make changes and see live updates

**Backend Changes**:
1. Open your preferred Java IDE
2. Import the Maven project
3. Make changes and use Spring Boot DevTools for hot reload

### 2. Testing Changes

**Run Tests**:
```bash
# Backend tests
mvn test

# Frontend tests  
cd openframe/services/openframe-frontend
npm run test

# Rust agent tests
cd client
cargo test
```

## Next Steps

### Immediate Actions (Next 30 minutes)
1. **Explore the API documentation**: [API Overview](../api/overview.md)
2. **Review architecture details**: [Architecture Overview](../development/architecture/overview.md)
3. **Set up your development environment**: [Development Setup](../development/setup/environment.md)

### Short-term Goals (Next few hours)
1. **Deploy additional integrated tools**
2. **Configure monitoring and alerting**
3. **Set up your first custom integration**
4. **Explore the client agent capabilities**

### Learning Resources
- **[Development Guide](../development/README.md)** - Comprehensive development documentation
- **[API Reference](../api/README.md)** - Complete API documentation
- **[Deployment Guide](../deployment/README.md)** - Production deployment information
- **[Operations Manual](../operations/README.md)** - Operational procedures

## Getting Help

### Documentation
- **Search this documentation** using your browser's search function
- **Check the troubleshooting guides** for common issues
- **Review the FAQ** for frequently asked questions

### Community
- **GitHub Issues**: Report bugs and request features
- **Discussion Forums**: Ask questions and share knowledge
- **Community Chat**: Real-time help and discussion

### Troubleshooting

**Common First-Time Issues**:
1. **Port conflicts**: Ensure required ports are available
2. **Permission issues**: Check file and directory permissions
3. **Service startup failures**: Review logs for specific error messages
4. **Authentication problems**: Verify credentials and token configuration

**Getting Logs**:
```bash
# Service logs
docker-compose logs -f [service-name]

# Application logs
tail -f logs/openframe.log

# System logs
journalctl -f -u openframe
```

**Quick Health Check**:
```bash
# Check all services
curl http://localhost:8080/actuator/health

# Check specific service
curl http://localhost:8080/api/services/health
```

## Congratulations!

You've completed your first steps with OpenFrame. You should now have:
- ✅ A running OpenFrame installation
- ✅ Understanding of core components
- ✅ Experience with the main interface
- ✅ Knowledge of key features and capabilities
- ✅ Direction for next steps

Ready to dive deeper? Continue with the [Development Guide](../development/README.md) or explore specific areas that interest you most.