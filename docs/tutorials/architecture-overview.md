# Architecture Overview

## Table of Contents

- [High-Level Architecture](#high-level-architecture)
- [Main Components](#main-components)
- [Data Flow](#data-flow)
- [Key Design Decisions](#key-design-decisions)
- [Directory Structure](#directory-structure)

## High-Level Architecture

OpenFrame follows a distributed microservices architecture designed for high performance, scalability, and security. The platform creates a unified layer on top of carefully selected open-source projects.

### Architecture Diagram Description

The architecture consists of four distinct layers:

```
┌─────────────────────────────────────────────────────┐
│                 Client Layer                        │
│  Web UI • Mobile Apps • API Clients • CLI Tools    │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│                 Gateway Layer                       │
│  Load Balancer • API Gateway • GraphQL • Auth      │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│               Processing Layer                      │
│  Stream Processing • Event Queue • Microservices   │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│                 Data Layer                          │
│  MongoDB • Cassandra • Apache Pinot • Redis        │
└─────────────────────────────────────────────────────┘
```

## Main Components

### Gateway Layer

#### **openframe-gateway**
- **Responsibility**: Entry point for all external requests
- **Key Features**:
  - JWT authentication and authorization
  - WebSocket support for real-time communication
  - Tool proxy for integrated services
  - Load balancing and rate limiting
- **Technology**: Java, Spring Boot

#### **openframe-api** 
- **Responsibility**: Core GraphQL API service
- **Key Features**:
  - GraphQL endpoint with schema federation
  - OAuth2/OpenID Connect integration
  - User and tenant management
  - Multi-tenant data isolation
- **Technology**: Java, Spring Boot, GraphQL Java

### Processing Layer

#### **Stream Processing Engine**
- **Responsibility**: Real-time event processing and analytics
- **Key Features**:
  - Handles 100,000+ events/second
  - Sub-500ms latency for critical operations
  - Anomaly detection and alerting
- **Technology**: Apache Kafka, Apache Pinot

#### **openframe-management**
- **Responsibility**: Administrative operations and system management
- **Key Features**:
  - Scheduled task execution
  - System health monitoring
  - Configuration management
  - Automated deployment orchestration
- **Technology**: Java, Spring Boot

### Data Layer

#### **Primary Databases**
- **MongoDB**: User data, configuration, metadata
- **Apache Cassandra**: Time-series data, logs, metrics
- **Apache Pinot**: Real-time analytics and OLAP queries
- **Redis**: Caching layer and session storage

### Frontend Layer

#### **openframe-frontend**
- **Responsibility**: Unified web interface
- **Key Features**:
  - Single dashboard for all services
  - Real-time monitoring and alerts
  - AI-powered insights and recommendations
- **Technology**: TypeScript, React, Next.js

### Client SDKs

#### **Rust Client**
- **Responsibility**: High-performance native client
- **Key Features**:
  - CLI tool for automation
  - Native performance for data-intensive operations
  - Cross-platform compatibility
- **Technology**: Rust, Tokio

## Data Flow

### 1. Request Flow
```
Client → Load Balancer → API Gateway → GraphQL Engine → Microservices → Database
```

### 2. Event Processing Flow
```
Event Source → Kafka → Stream Processor → Analytics Engine → Dashboard/Alerts
```

### 3. Authentication Flow
```
Client → Auth Service → JWT Token → API Gateway → Protected Resources
```

### 4. Real-time Updates
```
Data Change → Event Queue → WebSocket → Frontend → User Interface Update
```

## Key Design Decisions

### **1. Microservices Architecture**
- **Decision**: Split functionality into independent, deployable services
- **Rationale**: Enables independent scaling, technology diversity, and team autonomy
- **Trade-off**: Increased complexity vs. improved scalability and maintainability

### **2. GraphQL API Layer**
- **Decision**: Use GraphQL instead of REST for client-facing APIs
- **Rationale**: Single endpoint, type safety, and efficient data fetching
- **Trade-off**: Learning curve vs. improved developer experience

### **3. Event-Driven Architecture**
- **Decision**: Use Apache Kafka for inter-service communication
- **Rationale**: Decoupling, scalability, and built-in fault tolerance
- **Trade-off**: Eventual consistency vs. real-time performance

### **4. Multi-Database Strategy**
- **Decision**: Use different databases for different data types
- **Rationale**: Optimize for specific use cases (OLTP vs OLAP vs caching)
- **Trade-off**: Operational complexity vs. performance optimization

### **5. Containerized Deployment**
- **Decision**: Docker-based deployment with Kubernetes orchestration
- **Rationale**: Environment consistency, scalability, and resource efficiency
- **Trade-off**: Infrastructure complexity vs. deployment flexibility

## Directory Structure

```
openframe/
├── services/                           # Core microservices
│   ├── openframe-gateway/             # API Gateway service
│   │   ├── src/main/java/             # Java source code
│   │   ├── src/main/resources/        # Configuration files
│   │   └── pom.xml                    # Maven dependencies
│   ├── openframe-api/                 # GraphQL API service
│   │   ├── src/main/java/             # Java source code
│   │   └── pom.xml                    # Maven dependencies
│   ├── openframe-management/          # Management service
│   │   ├── src/main/java/             # Java source code
│   │   └── pom.xml                    # Maven dependencies
│   └── openframe-frontend/            # React frontend
│       ├── src/                       # TypeScript/React source
│       ├── package.json               # Node.js dependencies
│       └── next.config.js             # Next.js configuration
├── client/                            # Rust client SDK
│   ├── src/                           # Rust source code
│   ├── Cargo.toml                     # Rust dependencies
│   └── README.md                      # Client documentation
├── integrated-tools/                  # Third-party integrations
│   ├── tactical-rmm/                  # RMM tool integration
│   ├── fleetmdm/                      # MDM integration
│   ├── meshcentral/                   # Remote access integration
│   └── authentik/                     # Identity provider integration
├── scripts/                           # Development and deployment scripts
│   ├── run-mac.sh                     # macOS development setup
│   ├── run-linux.sh                  # Linux development setup
│   └── run-windows.ps1               # Windows development setup
├── docs/                              # Documentation
│   ├── assets/                        # Images and media
│   └── codewiki/                      # Technical documentation
├── shared/                            # Shared libraries and utilities
│   └── openframe-common/              # Common Java utilities
└── pom.xml                            # Root Maven configuration
```

### Key Directory Explanations

- **`services/`**: Contains all microservices with independent build and deployment configurations
- **`client/`**: Rust-based CLI and SDK for programmatic access
- **`integrated-tools/`**: Docker Compose configurations for third-party tools
- **`scripts/`**: Platform-specific development environment setup scripts
- **`shared/`**: Common libraries and utilities shared across services
- **`docs/`**: All project documentation, including this architecture overview

### Build System Organization

- **Root Level**: Maven parent POM for Java services coordination
- **Service Level**: Independent Maven projects with their own dependencies
- **Frontend**: Node.js/npm build system separate from Java services
- **Client**: Cargo build system for Rust components

This structure enables independent development and deployment while maintaining shared dependencies and common patterns across the platform.