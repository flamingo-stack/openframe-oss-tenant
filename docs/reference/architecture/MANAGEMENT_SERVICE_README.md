# Management Service Documentation

> **Central control plane for managing integrated tools, agents, and CDC connectors in the OpenFrame platform**

---

## 📚 Quick Navigation

### Main Documentation
**[📖 Management Service Overview](management_service.md)** - Start here for complete overview, architecture, and API reference

### Sub-Module Documentation

| Module | Description | Key Components |
|--------|-------------|----------------|
| **[⚙️ Configuration](management_service_configuration.md)** | Spring Boot configuration and component scanning | `ManagementConfiguration`, `AgentConfigurationProperties` |
| **[🔧 Tool Management](management_service_tool_management.md)** | REST API for integrated tool CRUD operations | `IntegratedToolController`, `IntegratedToolPostSaveHook` |
| **[🤖 Agent Management](management_service_agent_management.md)** | Agent lifecycle and version management | `IntegratedToolAgentInitializer` |
| **[📊 CDC Management](management_service_cdc_management.md)** | Debezium connector health monitoring | `DebeziumService`, `DebeziumHealthCheckScheduler` |
| **[🚀 Application](management_service_application.md)** | Spring Boot application bootstrap | `ManagementApplication` |

### Additional Resources
- **[📋 Documentation Summary](MANAGEMENT_SERVICE_SUMMARY.md)** - Complete documentation index and structure

---

## 🎯 What is the Management Service?

The Management Service is the **administrative control plane** for the OpenFrame platform, responsible for:

- 🔌 **Tool Integration Management**: Configure and manage third-party tools (Fleet MDM, Tactical RMM, MeshCentral)
- 🤖 **Agent Lifecycle**: Initialize, version, and update tool agents deployed to client machines
- 📊 **CDC Orchestration**: Automate Debezium connector creation and health monitoring
- 🔄 **Change Data Capture**: Stream database changes to Kafka for real-time synchronization
- 🛡️ **Health Monitoring**: Automatic detection and recovery of failed CDC tasks

---

## 🏗️ Architecture at a Glance

```text
┌─────────────────────────────────────────────────────────────┐
│                    Management Service                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │     Tool     │  │    Agent     │  │     CDC      │      │
│  │  Management  │  │  Management  │  │  Management  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                 │                  │               │
│         └─────────────────┴──────────────────┘               │
│                           │                                   │
└───────────────────────────┼───────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
   ┌─────────┐        ┌─────────┐        ┌──────────┐
   │ MongoDB │        │  Kafka  │        │ Debezium │
   │  (Data) │        │ (Events)│        │ Connect  │
   └─────────┘        └─────────┘        └──────────┘
```

---

## 🚀 Quick Start

### 1. Read the Overview
Start with the [main documentation](management_service.md) to understand the service architecture and capabilities.

### 2. Explore Sub-Modules
Dive into specific sub-modules based on your needs:
- **Configuring the service?** → [Configuration Module](management_service_configuration.md)
- **Building tool integrations?** → [Tool Management Module](management_service_tool_management.md)
- **Managing agents?** → [Agent Management Module](management_service_agent_management.md)
- **Working with CDC?** → [CDC Management Module](management_service_cdc_management.md)

### 3. API Reference
Check the [API Reference section](management_service.md#api-reference) in the main documentation for endpoint details.

---

## 📖 Documentation Structure

Each documentation file follows a consistent structure:

```text
├── Overview
│   ├── Purpose and responsibilities
│   └── Key features
│
├── Architecture
│   ├── System context diagrams
│   ├── Component architecture
│   └── Interaction flows
│
├── Core Components
│   ├── Component descriptions
│   ├── Code examples
│   └── Configuration details
│
├── Integration Points
│   ├── Dependencies
│   └── External systems
│
├── Configuration
│   ├── Properties
│   └── Examples
│
├── Development Guide
│   ├── Implementation patterns
│   └── Testing strategies
│
└── Troubleshooting
    ├── Common issues
    └── Solutions
```

---

## 🔑 Key Features

### Tool Management
- ✅ RESTful API for tool configuration
- ✅ Automatic Debezium connector provisioning
- ✅ Hook-based extensibility
- ✅ Credential management

### Agent Management
- ✅ Automatic initialization from JSON configs
- ✅ Version management (release vs development)
- ✅ Update notifications via Kafka
- ✅ Multi-platform support

### CDC Management
- ✅ Connector lifecycle automation
- ✅ Health monitoring with ShedLock
- ✅ Automatic task restart
- ✅ Distributed coordination

---

## 🔗 Related Services

The Management Service integrates with:

- **[API Service](api_service.md)** - Exposes tool configurations to frontend
- **[Client Service](client_service.md)** - Deploys agents to client machines
- **[Stream Processing](stream_processing.md)** - Processes CDC events
- **[Gateway Service](gateway_service.md)** - API gateway and security

---

## 📊 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/v1/tools` | List all integrated tools |
| `GET` | `/v1/tools/{id}` | Get specific tool configuration |
| `POST` | `/v1/tools/{id}` | Create or update tool configuration |

See [API Reference](management_service.md#api-reference) for detailed documentation.

---

## ⚙️ Configuration

### Minimal Configuration

```yaml
openframe:
  management:
    agent-configurations:
      - "agents/fleet-mdm-agent.json"
  debezium:
    base-url: "http://debezium-connect:8083"
    health-check:
      enabled: true
```

See [Configuration Guide](management_service.md#configuration) for complete options.

---

## 🐳 Deployment

### Docker Compose

```yaml
services:
  management-service:
    image: openframe/management-service:latest
    environment:
      - MONGODB_URI=mongodb://mongodb:27017/openframe
      - DEBEZIUM_BASE_URL=http://debezium-connect:8083
    ports:
      - "8084:8080"
```

See [Deployment Guide](management_service.md#deployment) for production setup.

---

## 🔍 Monitoring

### Key Metrics
- Tool configuration changes
- Agent initialization success/failure rates
- Debezium connector health status
- Failed task restart attempts

See [Monitoring Guide](management_service.md#monitoring-and-observability) for details.

---

## 🛠️ Development

### Adding a New Tool Integration

```java
IntegratedTool tool = IntegratedTool.builder()
    .id("new-tool")
    .name("New Tool")
    .type("monitoring")
    .enabled(true)
    .build();
```

See [Development Guide](management_service.md#development-guide) for complete examples.

---

## 🐛 Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Connector creation fails | Check Debezium Connect service status |
| Agent initialization fails | Verify JSON configuration file format |
| Health check not running | Enable health check in configuration |

See [Troubleshooting Guide](management_service.md#troubleshooting) for detailed solutions.

---

## 📚 Additional Resources

### Documentation Files
- **[management_service.md](management_service.md)** - Main documentation (comprehensive)
- **[management_service_configuration.md](management_service_configuration.md)** - Configuration module
- **[management_service_tool_management.md](management_service_tool_management.md)** - Tool management module
- **[management_service_agent_management.md](management_service_agent_management.md)** - Agent management module
- **[management_service_cdc_management.md](management_service_cdc_management.md)** - CDC management module
- **[management_service_application.md](management_service_application.md)** - Application bootstrap
- **[MANAGEMENT_SERVICE_SUMMARY.md](MANAGEMENT_SERVICE_SUMMARY.md)** - Documentation summary

### External Links
- **OpenFrame Platform**: https://openframe.ai
- **Flamingo**: https://flamingo.run
- **OpenMSP Community**: https://www.openmsp.ai/

---

## 💬 Support

For questions or issues, reach out on the **OpenMSP Slack community**:

- **Website**: https://www.openmsp.ai/
- **Join Slack**: https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA

> **Note**: We do not use GitHub Issues or GitHub Discussions. All support happens on Slack.

---

## 📄 License

Part of the OpenFrame platform by Flamingo. See the main repository for license information.

---

## 🗺️ Documentation Map

```text
Management Service Documentation
│
├── 📖 MANAGEMENT_SERVICE_README.md (You are here)
│   └── Quick navigation and overview
│
├── 📘 management_service.md
│   ├── Complete architecture overview
│   ├── API reference
│   ├── Configuration guide
│   ├── Development guide
│   └── Troubleshooting
│
├── ⚙️ management_service_configuration.md
│   ├── Spring Boot configuration
│   ├── Component scanning
│   └── Agent configuration properties
│
├── 🔧 management_service_tool_management.md
│   ├── REST API endpoints
│   ├── Tool CRUD operations
│   └── Post-save hooks
│
├── 🤖 management_service_agent_management.md
│   ├── Agent initialization
│   ├── Version management
│   └── Update notifications
│
├── 📊 management_service_cdc_management.md
│   ├── Debezium connector management
│   ├── Health monitoring
│   └── Automatic recovery
│
├── 🚀 management_service_application.md
│   └── Application bootstrap
│
└── 📋 MANAGEMENT_SERVICE_SUMMARY.md
    └── Complete documentation index
```

---

**Happy documenting! 🚀**
