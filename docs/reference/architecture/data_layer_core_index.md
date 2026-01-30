# Data Layer Core - Documentation Index

## 📖 Documentation Overview

This index provides a comprehensive guide to all documentation for the **Data Layer Core** module, which provides high-performance analytical data access for the OpenFrame platform through Apache Pinot and Apache Cassandra.

---

## 🚀 Quick Start

**New to Data Layer Core?** Start here:

1. **[README](./DATA_LAYER_CORE_README.md)** - Quick start guide with examples
2. **[Summary](./DATA_LAYER_CORE_SUMMARY.md)** - Executive overview and key concepts
3. **[Main Documentation](./data_layer_core.md)** - Complete module documentation

---

## 📚 Complete Documentation Set

### Main Documentation

| Document | Description | Audience | Read Time |
|----------|-------------|----------|-----------|
| **[DATA_LAYER_CORE_README.md](./DATA_LAYER_CORE_README.md)** | Quick start guide, configuration, and usage examples | Developers | 15 min |
| **[DATA_LAYER_CORE_SUMMARY.md](./DATA_LAYER_CORE_SUMMARY.md)** | Executive summary with architecture and use cases | Architects, Team Leads | 10 min |
| **[data_layer_core.md](./data_layer_core.md)** | Complete module documentation with architecture | All | 30 min |

### Sub-Module Documentation

| Document | Description | Key Topics | Read Time |
|----------|-------------|------------|-----------|
| **[data_layer_core_configuration.md](./data_layer_core_configuration.md)** | Cassandra and Pinot configuration | Auto-configuration, connection management, schema setup | 15 min |
| **[data_layer_core_pinot_repositories.md](./data_layer_core_pinot_repositories.md)** | Device and log repositories | Query patterns, filtering, pagination, search | 20 min |
| **[data_layer_core_query_builders.md](./data_layer_core_query_builders.md)** | SQL query construction | Fluent API, security, validation, optimization | 20 min |

---

## 🎯 Documentation by Role

### For Developers

**Getting Started**:
1. [README - Quick Start](./DATA_LAYER_CORE_README.md#-quick-start)
2. [README - Configuration](./DATA_LAYER_CORE_README.md#-configuration-reference)
3. [README - Usage Examples](./DATA_LAYER_CORE_README.md#-usage-examples)

**Implementation Guides**:
1. [Pinot Repositories - Device Filtering](./data_layer_core_pinot_repositories.md#pinotclientdevicerepository)
2. [Pinot Repositories - Log Search](./data_layer_core_pinot_repositories.md#pinotclientlogrepository)
3. [Query Builders - Building Queries](./data_layer_core_query_builders.md#query-building-patterns)

**Testing**:
1. [README - Testing](./DATA_LAYER_CORE_README.md#-testing)
2. [Main Docs - Testing](./data_layer_core.md#testing)

---

### For Architects

**Architecture Overview**:
1. [Summary - Architecture at a Glance](./DATA_LAYER_CORE_SUMMARY.md#-architecture-at-a-glance)
2. [Main Docs - Architecture Overview](./data_layer_core.md#architecture-overview)
3. [Main Docs - Integration with Other Modules](./data_layer_core.md#integration-with-other-modules)

**Performance & Scaling**:
1. [Summary - Performance Characteristics](./DATA_LAYER_CORE_SUMMARY.md#-performance-characteristics)
2. [Main Docs - Performance Considerations](./data_layer_core.md#performance-considerations)
3. [Main Docs - Scaling Strategies](./data_layer_core.md#performance-considerations)

**Security**:
1. [Summary - Security Features](./DATA_LAYER_CORE_SUMMARY.md#-security-features)
2. [Query Builders - Security Features](./data_layer_core_query_builders.md#security-features)

---

### For DevOps/SRE

**Configuration**:
1. [Configuration - Cassandra Setup](./data_layer_core_configuration.md#cassandra-configuration)
2. [Configuration - Pinot Setup](./data_layer_core_configuration.md#pinot-configuration)
3. [README - Configuration Reference](./DATA_LAYER_CORE_README.md#-configuration-reference)

**Monitoring**:
1. [Summary - Operational Considerations](./DATA_LAYER_CORE_SUMMARY.md#-operational-considerations)
2. [README - Monitoring and Observability](./DATA_LAYER_CORE_README.md#-monitoring-and-observability)

**Troubleshooting**:
1. [Summary - Common Issues](./DATA_LAYER_CORE_SUMMARY.md#-common-issues-and-solutions)
2. [README - Troubleshooting](./DATA_LAYER_CORE_README.md#-troubleshooting)
3. [Main Docs - Troubleshooting](./data_layer_core.md#troubleshooting)

---

## 🔍 Documentation by Topic

### Configuration & Setup

| Topic | Document | Section |
|-------|----------|---------|
| Cassandra Configuration | [Configuration](./data_layer_core_configuration.md) | Cassandra Configuration |
| Pinot Configuration | [Configuration](./data_layer_core_configuration.md) | Pinot Configuration |
| Conditional Enablement | [Configuration](./data_layer_core_configuration.md) | Conditional Repository Activation |
| Application Properties | [Main Docs](./data_layer_core.md) | Configuration |

### Repositories & Queries

| Topic | Document | Section |
|-------|----------|---------|
| Device Repository | [Pinot Repositories](./data_layer_core_pinot_repositories.md) | PinotClientDeviceRepository |
| Log Repository | [Pinot Repositories](./data_layer_core_pinot_repositories.md) | PinotClientLogRepository |
| Query Builder API | [Query Builders](./data_layer_core_query_builders.md) | Core Components |
| Filter Options | [Pinot Repositories](./data_layer_core_pinot_repositories.md) | Dynamic Filter Options |
| Full-Text Search | [Pinot Repositories](./data_layer_core_pinot_repositories.md) | Full-Text Search |
| Pagination | [Pinot Repositories](./data_layer_core_pinot_repositories.md) | Cursor-Based Pagination |

### Performance & Optimization

| Topic | Document | Section |
|-------|----------|---------|
| Query Performance | [Summary](./DATA_LAYER_CORE_SUMMARY.md) | Performance Characteristics |
| Scaling Strategies | [Main Docs](./data_layer_core.md) | Performance Considerations |
| Query Optimization | [Query Builders](./data_layer_core_query_builders.md) | Best Practices |
| Benchmarks | [Summary](./DATA_LAYER_CORE_SUMMARY.md) | Query Performance Benchmarks |

### Security

| Topic | Document | Section |
|-------|----------|---------|
| SQL Injection Prevention | [Query Builders](./data_layer_core_query_builders.md) | Security Features |
| Multi-Tenant Isolation | [Summary](./DATA_LAYER_CORE_SUMMARY.md) | Security Features |
| Input Validation | [Query Builders](./data_layer_core_query_builders.md) | Validation |

### Integration

| Topic | Document | Section |
|-------|----------|---------|
| Service Integration | [Main Docs](./data_layer_core.md) | Integration with Other Modules |
| Data Layer Ecosystem | [Main Docs](./data_layer_core.md) | Data Layer Ecosystem |
| API Service Integration | [Summary](./DATA_LAYER_CORE_SUMMARY.md) | Integration Points |

---

## 📊 Diagrams & Visualizations

### Architecture Diagrams

| Diagram | Location | Description |
|---------|----------|-------------|
| Module Architecture | [Main Docs](./data_layer_core.md#architecture-overview) | Overall module structure |
| Data Flow | [README](./DATA_LAYER_CORE_README.md#-architecture) | Data flow between services |
| Configuration Layer | [Configuration](./data_layer_core_configuration.md#architecture-overview) | Configuration components |
| Repository Layer | [Pinot Repositories](./data_layer_core_pinot_repositories.md#architecture) | Repository architecture |
| Query Builder Flow | [Query Builders](./data_layer_core_query_builders.md#architecture) | Query construction flow |

### Integration Diagrams

| Diagram | Location | Description |
|---------|----------|-------------|
| Data Layer Ecosystem | [Main Docs](./data_layer_core.md#data-layer-ecosystem) | Integration with other data layers |
| Service Integration | [Main Docs](./data_layer_core.md#service-integration) | Service dependencies |
| Pinot Ingestion | [Main Docs](./data_layer_core.md#real-time-analytics-with-apache-pinot) | Data ingestion pipeline |

### Performance Diagrams

| Diagram | Location | Description |
|---------|----------|-------------|
| Scaling Model | [Summary](./DATA_LAYER_CORE_SUMMARY.md#scaling-model) | Horizontal scaling strategy |
| Horizontal Scaling | [Main Docs](./data_layer_core.md#scaling-strategies) | Pinot cluster scaling |

---

## 🎓 Learning Paths

### Path 1: Quick Implementation (1-2 hours)

For developers who need to use the module quickly:

1. **[README - Quick Start](./DATA_LAYER_CORE_README.md#-quick-start)** (15 min)
   - Add dependency
   - Configure properties
   - Basic usage

2. **[README - Usage Examples](./DATA_LAYER_CORE_README.md#-usage-examples)** (30 min)
   - Device filtering
   - Log search
   - Custom queries

3. **[Pinot Repositories - Usage Examples](./data_layer_core_pinot_repositories.md#usage-examples)** (30 min)
   - Repository patterns
   - Filter options
   - Pagination

4. **[README - Troubleshooting](./DATA_LAYER_CORE_README.md#-troubleshooting)** (15 min)
   - Common issues
   - Quick fixes

---

### Path 2: Comprehensive Understanding (4-6 hours)

For developers who need deep understanding:

1. **[Summary - Executive Overview](./DATA_LAYER_CORE_SUMMARY.md)** (30 min)
   - Module purpose
   - Architecture overview
   - Key concepts

2. **[Main Docs - Complete Documentation](./data_layer_core.md)** (90 min)
   - Detailed architecture
   - All features
   - Integration patterns

3. **[Configuration - Setup Guide](./data_layer_core_configuration.md)** (45 min)
   - Cassandra configuration
   - Pinot configuration
   - Best practices

4. **[Pinot Repositories - Deep Dive](./data_layer_core_pinot_repositories.md)** (60 min)
   - Repository implementations
   - Query patterns
   - Advanced features

5. **[Query Builders - Advanced Topics](./data_layer_core_query_builders.md)** (60 min)
   - Query construction
   - Security features
   - Optimization techniques

6. **[README - Testing & Monitoring](./DATA_LAYER_CORE_README.md#-testing)** (30 min)
   - Unit testing
   - Integration testing
   - Monitoring setup

---

### Path 3: Architecture & Design (2-3 hours)

For architects and technical leads:

1. **[Summary - Architecture at a Glance](./DATA_LAYER_CORE_SUMMARY.md#-architecture-at-a-glance)** (20 min)
   - High-level architecture
   - Component overview

2. **[Main Docs - Architecture Overview](./data_layer_core.md#architecture-overview)** (45 min)
   - Detailed architecture
   - Design patterns
   - Component relationships

3. **[Main Docs - Integration with Other Modules](./data_layer_core.md#integration-with-other-modules)** (30 min)
   - Data layer ecosystem
   - Service integration
   - Dependencies

4. **[Summary - Performance Characteristics](./DATA_LAYER_CORE_SUMMARY.md#-performance-characteristics)** (30 min)
   - Benchmarks
   - Scaling model
   - Optimization strategies

5. **[Main Docs - Performance Considerations](./data_layer_core.md#performance-considerations)** (30 min)
   - Query optimization
   - Scaling strategies
   - Best practices

6. **[Summary - Security Features](./DATA_LAYER_CORE_SUMMARY.md#-security-features)** (15 min)
   - SQL injection prevention
   - Multi-tenant isolation

---

## 🔗 Related Documentation

### Other Data Layer Modules

| Module | Documentation | Relationship |
|--------|---------------|--------------|
| **Data Layer MongoDB** | [data_layer_mongo.md](./data_layer_mongo.md) | Transactional data source |
| **Data Layer Kafka** | [data_layer_kafka.md](./data_layer_kafka.md) | Event streaming |

### Service Modules

| Service | Documentation | Usage |
|---------|---------------|-------|
| **API Service** | [api_service.md](./api_service.md) | Primary consumer |
| **External API** | [external_api.md](./external_api.md) | Public API consumer |
| **Stream Processing** | [stream_processing.md](./stream_processing.md) | Data ingestion |

---

## 📖 External Resources

### Apache Pinot
- **Official Documentation**: https://docs.pinot.apache.org/
- **Query Language Reference**: https://docs.pinot.apache.org/users/user-guide-query/querying-pinot
- **Performance Tuning Guide**: https://docs.pinot.apache.org/operators/operating-pinot/tuning
- **GitHub Repository**: https://github.com/apache/pinot

### Apache Cassandra
- **Official Documentation**: https://cassandra.apache.org/doc/latest/
- **Data Modeling Guide**: https://cassandra.apache.org/doc/latest/cassandra/data_modeling/
- **Spring Data Cassandra**: https://spring.io/projects/spring-data-cassandra
- **CQL Reference**: https://cassandra.apache.org/doc/latest/cassandra/cql/

### OpenFrame Platform
- **OpenFrame Website**: https://www.flamingo.run/openframe
- **Flamingo Platform**: https://flamingo.run
- **OpenMSP Community**: https://www.openmsp.ai/
- **Slack Community**: https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA

---

## 🆘 Getting Help

### Documentation Issues

If you find issues with the documentation:
1. Join our [OpenMSP Slack Community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
2. Post in the `#documentation` channel
3. Provide specific document and section references

### Technical Support

For technical questions:
1. Check [Troubleshooting](./DATA_LAYER_CORE_README.md#-troubleshooting) section
2. Review [Common Issues](./DATA_LAYER_CORE_SUMMARY.md#-common-issues-and-solutions)
3. Ask in [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) `#support` channel

### Contributing

To contribute to documentation:
1. Follow existing documentation structure
2. Use consistent formatting and style
3. Include code examples and diagrams
4. Test all code examples
5. Submit via Slack community discussion

---

## 📝 Documentation Conventions

### File Naming

- **README files**: `DATA_LAYER_CORE_README.md` (uppercase)
- **Summary files**: `DATA_LAYER_CORE_SUMMARY.md` (uppercase)
- **Main docs**: `data_layer_core.md` (lowercase with underscores)
- **Sub-modules**: `data_layer_core_[submodule].md` (lowercase with underscores)
- **Index files**: `data_layer_core_index.md` (lowercase with underscores)

### Section Conventions

- **Overview**: High-level introduction and purpose
- **Architecture**: System design and component relationships
- **Configuration**: Setup and configuration details
- **Usage Examples**: Practical code examples
- **Best Practices**: Recommended patterns and approaches
- **Troubleshooting**: Common issues and solutions

### Code Example Conventions

- Always include language identifiers in code blocks
- Provide context for each example
- Include comments for clarity
- Show both correct and incorrect patterns where relevant
- Use realistic variable names and values

---

## 🔄 Documentation Updates

**Last Updated**: 2024  
**Module Version**: Part of OpenFrame OSS Library  
**Documentation Version**: 1.0

### Recent Changes

- Initial documentation release
- Complete coverage of all sub-modules
- Comprehensive examples and diagrams
- Integration with other module documentation

### Planned Updates

- Performance tuning guide
- Advanced query patterns
- Migration guides
- Video tutorials

---

## 📞 Contact

**OpenFrame Team**
- 💬 **Slack**: https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA
- 📧 **Email**: support@flamingo.run
- 🌐 **Website**: https://www.flamingo.run/openframe

**Note**: We manage all discussions on our OpenMSP Slack community. We don't use GitHub Issues or GitHub Discussions.

---

**Built with ❤️ by the OpenFrame Team**
