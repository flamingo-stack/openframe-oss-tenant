# OpenFrame

OpenFrame is a distributed platform built on microservices architecture, designed to unify multiple open-source tools under one cohesive system.

## Key Features
• High scalability and resilience through containerized microservices.  
• Unified authentication and single sign-on for integrated third-party dashboards and APIs.  
• Stream-oriented data ingestion (NiFi/Kafka) and flexible data storage engines (MongoDB, Cassandra, Pinot).  
• Comprehensive observability with Prometheus, Grafana, and Loki.

## Repository Layout
• config/ – Central YAML configurations for each microservice (API, Gateway, Management, Stream).  
• docker-compose.* – Docker Compose files for various service bundles (infrastructure, integrated tools, etc.).  
• infrastructure/ – Custom Dockerfiles or scripts for specialized services (like Cassandra or NiFi).  
• libs/ – Shared libraries (openframe-core, openframe-data) used by multiple microservices.  
• monitoring/ – Prometheus, Grafana, and alerting configurations/dashboards.  
• scripts/ – Automation scripts (e.g., build-and-run.sh).  
• services/ – Main microservices (API, Gateway, Stream, UI).

## Getting Started
1. Clone the repo and ensure Docker/Docker Compose are installed.  
2. For local development, run:
   » docker-compose -f docker-compose.openframe-infrastructure.yml up -d  
   This starts databases, Kafka, etc.  
3. (Optional) Start microservices individually or use scripts/build-and-run.sh to orchestrate everything.  
4. Access the UI, Gateway, or integrated dashboards via the exposed URLs.

## Contributing
• See CONTRIBUTING.md for guidelines on how to propose changes, file issues, etc.  
• Pull requests should include tests when adding features or fixing bugs.  
• Use the provided GitHub Actions CI for automated builds and test coverage.

## License
• See LICENSE for licensing details.

## Further Documentation
• Detailed guides in each microservice’s README.  
• Additional architecture info in the main “Architecture and Implementation Guide” or docs folder.  
