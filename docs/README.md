# OpenFrame Documentation

Welcome to the comprehensive OpenFrame documentation! This unified documentation hub provides everything you need to understand, develop, deploy, and operate the OpenFrame platform.

## 🚀 Quick Start Paths

### I'm New to OpenFrame
**Get started in 15 minutes:**
1. **[What is OpenFrame?](getting-started/introduction.md)** - Platform overview and capabilities
2. **[Prerequisites](getting-started/prerequisites.md)** - System requirements and tools
3. **[Quick Start Guide](getting-started/quick-start.md)** - Rapid 15-minute setup
4. **[Your First Hour](getting-started/first-steps.md)** - Essential tasks and exploration

### I'm a Developer
**Start building with OpenFrame:**
1. **[Development Environment](development/setup/environment.md)** - Set up your dev environment
2. **[Architecture Overview](development/architecture/overview.md)** - Understand the system design
3. **[Contributing Guidelines](development/contributing/guidelines.md)** - How to contribute effectively
4. **[API Documentation](api/README.md)** - Complete API reference

### I'm a DevOps Engineer
**Deploy and manage OpenFrame:**
1. **[Deployment Overview](deployment/README.md)** - Deployment strategies and options
2. **[Kubernetes Setup](deployment/kubernetes/cluster-setup.md)** - Production Kubernetes deployment
3. **[Operations Manual](operations/README.md)** - Monitoring, maintenance, and troubleshooting
4. **[Troubleshooting Guide](operations/troubleshooting/common-issues.md)** - Solve common issues

### I Need Quick Reference
**Find specific information fast:**
1. **[API Reference](reference/README.md)** - Complete technical reference
2. **[Configuration Guide](reference/configuration/overview.md)** - All configuration options
3. **[Service Documentation](reference/services/README.md)** - Individual service details
4. **[System Diagrams](diagrams/README.md)** - Visual architecture overview

## 📚 Documentation Sections

### 🎯 Getting Started
Perfect for newcomers and quick setup scenarios.

- **[Introduction](getting-started/introduction.md)** - What is OpenFrame and why use it?
- **[Prerequisites](getting-started/prerequisites.md)** - System requirements and preparation
- **[Quick Start](getting-started/quick-start.md)** - Get running in 15 minutes
- **[First Steps](getting-started/first-steps.md)** - Your first hour with OpenFrame

### 👩‍💻 Development Guide
Comprehensive resources for developers contributing to OpenFrame.

- **[Development Overview](development/README.md)** - Complete development guide
- **Setup & Environment**
  - [Environment Setup](development/setup/environment.md)
  - [Local Development](development/setup/local-development.md)
  - [Development Tools](development/setup/tools.md)
- **Architecture & Design**
  - [System Overview](development/architecture/overview.md)
  - [Microservices Architecture](development/architecture/microservices.md)
  - [Data Flow](development/architecture/data-flow.md)
  - [Security Architecture](development/architecture/security.md)
  - [Integration Patterns](development/architecture/integration.md)
- **Frontend Development**
  - [Vue.js Setup](development/frontend/vue-setup.md)
  - [Component Development](development/frontend/components.md)
  - [State Management](development/frontend/state-management.md)
- **Backend Development**
  - [Spring Boot Development](development/backend/spring-boot.md)
  - [GraphQL Implementation](development/backend/graphql.md)
  - [Microservices Development](development/backend/microservices.md)
  - [Data Access Patterns](development/backend/data-access.md)
- **Client Agent Development**
  - [Rust Development](development/client-agent/rust-development.md)
  - [Cross-Platform Considerations](development/client-agent/cross-platform.md)
  - [Service Integration](development/client-agent/service-integration.md)
- **Testing & Quality**
  - [Testing Overview](development/testing/overview.md)
  - [Backend Testing](development/testing/backend-testing.md)
  - [Frontend Testing](development/testing/frontend-testing.md)
  - [Integration Testing](development/testing/integration-testing.md)
- **Contributing & Collaboration**
  - [Contributing Guidelines](development/contributing/guidelines.md)
  - [Code Style Guide](development/contributing/code-style.md)
  - [Pull Request Process](development/contributing/pull-requests.md)
  - [Issue Templates](development/contributing/issue-templates.md)
- **Development Tools**
  - [Development Scripts](development/tools/scripts.md)
  - [Build System](development/tools/build-system.md)
  - [IDE Setup](development/tools/ide-setup.md)

### 🔌 API Documentation
Complete API reference and integration guides.

- **[API Overview](api/README.md)** - API architecture and principles
- **Authentication**
  - [Authentication Overview](api/authentication/overview.md)
  - [OAuth 2.0 Implementation](api/authentication/oauth2.md)
  - [JWT Token Management](api/authentication/jwt.md)
  - [API Key Management](api/authentication/api-keys.md)
  - [Google SSO](api/authentication/google-sso.md)
- **GraphQL API**
  - [GraphQL Overview](api/graphql/overview.md)
  - [Schema Documentation](api/graphql/schema.md)
  - [Queries](api/graphql/queries.md)
  - [Mutations](api/graphql/mutations.md)
  - [Subscriptions](api/graphql/subscriptions.md)
- **REST API**
  - [REST Overview](api/rest/overview.md)
  - [Endpoints](api/rest/endpoints.md)
  - [Integration Patterns](api/rest/integration.md)
- **WebSocket API**
  - [WebSocket Overview](api/websocket/overview.md)
  - [Connection Handling](api/websocket/connection.md)
  - [Message Formats](api/websocket/messages.md)
- **Integrated Tools**
  - [MeshCentral API](api/tools/meshcentral.md)
  - [Tactical RMM API](api/tools/tactical-rmm.md)
  - [Fleet MDM API](api/tools/fleet-mdm.md)

### 🚀 Deployment & Infrastructure
Production deployment guides and infrastructure management.

- **[Deployment Overview](deployment/README.md)** - Deployment strategies and architecture
- **Local Deployment**
  - [Docker Compose](deployment/local/docker-compose.md)
  - [Kind (Local Kubernetes)](deployment/local/kind.md)
  - [Local Troubleshooting](deployment/local/troubleshooting.md)
- **Kubernetes Deployment**
  - [Kubernetes Overview](deployment/kubernetes/overview.md)
  - [Cluster Setup](deployment/kubernetes/cluster-setup.md)
  - [Helm Charts](deployment/kubernetes/helm-charts.md)
  - [Network Configuration](deployment/kubernetes/networking.md)
  - [Storage Configuration](deployment/kubernetes/storage.md)
  - [Monitoring Setup](deployment/kubernetes/monitoring.md)
- **Cloud Deployment**
  - [AWS Deployment](deployment/cloud/aws.md)
  - [Azure Deployment](deployment/cloud/azure.md)
  - [Google Cloud Deployment](deployment/cloud/gcp.md)
  - [Cloud Best Practices](deployment/cloud/recommendations.md)
- **Security Configuration**
  - [TLS Certificates](deployment/security/tls-certificates.md)
  - [Secret Management](deployment/security/secrets.md)
  - [Network Policies](deployment/security/network-policies.md)

### 🔧 Operations Manual
Complete operational procedures for production environments.

- **[Operations Overview](operations/README.md)** - Operational responsibilities and procedures
- **Monitoring & Observability**
  - [Monitoring Overview](operations/monitoring/overview.md)
  - [Key Metrics](operations/monitoring/metrics.md)
  - [Alerting Configuration](operations/monitoring/alerting.md)
  - [Grafana Dashboards](operations/monitoring/dashboards.md)
- **Logging & Analysis**
  - [Logging Overview](operations/logging/overview.md)
  - [Log Collection](operations/logging/collection.md)
  - [Log Analysis](operations/logging/analysis.md)
- **System Maintenance**
  - [Update Procedures](operations/maintenance/updates.md)
  - [Scaling Operations](operations/maintenance/scaling.md)
  - [Cleanup Tasks](operations/maintenance/cleanup.md)
- **Backup & Recovery**
  - [Backup Strategy](operations/backup/strategy.md)
  - [Backup Procedures](operations/backup/procedures.md)
  - [Disaster Recovery](operations/backup/recovery.md)
- **Security Operations**
  - [Security Overview](operations/security/overview.md)
  - [Incident Response](operations/security/incident-response.md)
  - [Compliance Procedures](operations/security/compliance.md)
- **Troubleshooting**
  - [Common Issues](operations/troubleshooting/common-issues.md)
  - [Performance Issues](operations/troubleshooting/performance.md)
  - [Connectivity Issues](operations/troubleshooting/connectivity.md)
  - [Debugging Procedures](operations/troubleshooting/debugging.md)

### 📖 Reference Documentation
Technical reference for all OpenFrame components.

- **[Reference Overview](reference/README.md)** - Complete technical reference
- **Configuration**
  - [Configuration Overview](reference/configuration/overview.md)
  - [Service Configuration](reference/configuration/services.md)
  - [Environment Variables](reference/configuration/environment.md)
  - [Secret Configuration](reference/configuration/secrets.md)
- **Libraries**
  - [OpenFrame Data](reference/libraries/openframe-data.md)
  - [OpenFrame JWT](reference/libraries/openframe-jwt.md)
  - [API Library](reference/libraries/api-library.md)
- **Services**
  - [OpenFrame API](reference/services/openframe-api.md)
  - [OpenFrame Gateway](reference/services/openframe-gateway.md)
  - [OpenFrame Client](reference/services/openframe-client.md)
  - [OpenFrame Stream](reference/services/openframe-stream.md)
  - [OpenFrame Management](reference/services/openframe-management.md)
  - [OpenFrame Config](reference/services/openframe-config.md)
  - [OpenFrame Frontend](reference/services/openframe-frontend.md)
- **Data Storage**
  - [MongoDB Schemas](reference/data/mongodb.md)
  - [Cassandra Schemas](reference/data/cassandra.md)
  - [Redis Usage](reference/data/redis.md)
  - [Kafka Topics](reference/data/kafka.md)
- **Tool Integrations**
  - [Tactical RMM](reference/tools/tactical-rmm.md)
  - [MeshCentral](reference/tools/meshcentral.md)
  - [Fleet MDM](reference/tools/fleet-mdm.md)
  - [Authentik](reference/tools/authentik.md)

### 📊 Architecture & Diagrams
Visual documentation and system architecture diagrams.

- **[Diagrams Overview](diagrams/README.md)** - Visual system documentation
- **Architecture Diagrams**
  - [System Overview](diagrams/architecture/system-overview.md)
  - [Data Flow Diagrams](diagrams/architecture/data-flow.md)
  - [Service Interactions](diagrams/architecture/service-interaction.md)
  - [Security Model](diagrams/architecture/security-model.md)
- **Deployment Diagrams**
  - [Kubernetes Architecture](diagrams/deployment/kubernetes.md)
  - [Network Topology](diagrams/deployment/network-topology.md)
  - [Infrastructure Layout](diagrams/deployment/infrastructure.md)
- **Integration Diagrams**
  - [Tool Integration Patterns](diagrams/integration/tool-integration.md)
  - [API Flow Diagrams](diagrams/integration/api-flows.md)

## 🎯 Popular Topics

### Most Accessed Documentation
1. **[Quick Start Guide](getting-started/quick-start.md)** - Get running in 15 minutes
2. **[API Reference](reference/README.md)** - Complete API documentation
3. **[Troubleshooting Guide](operations/troubleshooting/common-issues.md)** - Solve common issues
4. **[Development Setup](development/setup/environment.md)** - Set up development environment
5. **[Deployment Guide](deployment/kubernetes/cluster-setup.md)** - Production deployment

### Recently Updated
- **[Operations Manual](operations/README.md)** - Complete operational procedures
- **[API Authentication](api/authentication/overview.md)** - Updated OAuth 2.0 flows
- **[System Architecture](development/architecture/overview.md)** - Enhanced microservices documentation
- **[Troubleshooting](operations/troubleshooting/common-issues.md)** - New common issues and solutions

## 🔧 Developer Resources

### Essential Tools
- **[Development Scripts](development/tools/scripts.md)** - Automated development tasks
- **[API Testing](api/rest/integration.md)** - API testing strategies
- **[Local Development](development/setup/local-development.md)** - Running OpenFrame locally
- **[Code Style Guide](development/contributing/code-style.md)** - Coding standards

### Community Resources
- **[Contributing Guide](development/contributing/guidelines.md)** - How to contribute
- **[Issue Templates](development/contributing/issue-templates.md)** - Bug reports and features
- **GitHub Repository**: https://github.com/flamingo-stack/openframe-oss-tenant
- **Community Forum**: https://community.openframe.org

## 🚨 Quick Help

### Need Immediate Help?
- **Production Issues**: Start with [Common Issues](operations/troubleshooting/common-issues.md)
- **API Problems**: Check [API Authentication](api/authentication/overview.md)
- **Development Blocks**: See [Development Troubleshooting](development/setup/environment.md#troubleshooting)
- **Deployment Failures**: Review [Deployment Troubleshooting](deployment/local/troubleshooting.md)

### Emergency Contacts
- **Critical Issues**: Use the escalation procedures in [Operations Manual](operations/README.md)
- **Security Issues**: Follow [Incident Response](operations/security/incident-response.md)
- **GitHub Issues**: https://github.com/flamingo-stack/openframe-oss-tenant/issues

## 📈 What's New

### Latest Features
- **Enhanced Authentication**: OAuth 2.0 with JWT cookies
- **Improved Monitoring**: Comprehensive Grafana dashboards
- **Better Documentation**: Restructured and expanded documentation
- **Advanced Security**: Enhanced security policies and procedures

### Coming Soon
- **GraphQL Subscriptions**: Real-time data subscriptions
- **Advanced Analytics**: Enhanced data processing capabilities
- **Multi-tenant Support**: Enterprise multi-tenancy features
- **Cloud Integration**: Native cloud provider integrations

## 🤝 Contributing to Documentation

We welcome contributions to improve our documentation! Here's how you can help:

### Quick Contributions
- **Fix typos or errors**: Create a pull request with corrections
- **Add examples**: Contribute code examples and use cases
- **Improve clarity**: Suggest improvements to existing content
- **Report issues**: Use GitHub issues to report documentation problems

### Major Contributions
- **New sections**: Propose new documentation sections
- **Architecture changes**: Update diagrams and architecture docs
- **Tutorial creation**: Create comprehensive tutorials
- **Translation**: Help translate documentation

See our [Contributing Guidelines](development/contributing/guidelines.md) for detailed information.

## 📊 Documentation Statistics

- **Total Pages**: 80+ comprehensive documentation pages
- **Quick Start Time**: 15 minutes from zero to running
- **Coverage Areas**: 6 major documentation sections
- **Last Updated**: Continuously updated with each release
- **Maintenance**: Active community-driven maintenance

---

**Welcome to OpenFrame!** 🚀 

This documentation is your comprehensive guide to mastering the OpenFrame platform. Whether you're just getting started or you're an experienced developer, you'll find the resources you need to be successful.

*Found an issue with the documentation? [Report it here](https://github.com/flamingo-stack/openframe-oss-tenant/issues) or contribute a fix!*