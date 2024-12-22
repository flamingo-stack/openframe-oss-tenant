# Deployment Guide

Explains how to build, configure, and deploy the OpenFrame platform 
in different environments (local, staging, production).

## Prerequisites
- Java 21, Maven 3.9+, Docker & Compose, Kubernetes  
- Credentials for environment secrets, container registry access

## Build Steps
1. Clone the repository  
2. Run mvn clean install to build all modules (including [libs/openframe-core](../libs/openframe-core))  
3. Navigate to [services/openframe-ui](../services/openframe-ui) if you need to build the frontend (via npm or yarn):
    ```bash
    cd services/openframe-ui
    npm install
    npm run build
    ```
4. (Optional) Create Docker images (via the spring-boot-maven-plugin or Dockerfiles)
5. (Optional) Run the helper script in /scripts/build-and-run.sh to build JARs and start containers.

## Configuration
- Environment variables for each service (SPRING_PROFILES_ACTIVE, etc.)  
- External YAML configs (NiFi, Kafka, etc.)
- The scripts directory includes build-jars.sh and test-network.sh, which can help verify environments.

## Deployment Scenarios
- Local Docker Compose for dev (see scripts/build-and-run.sh)  
- Kubernetes (Helm chart or custom manifests)  
- Strategies like rolling updates or canary deployments

## Using Automated Scripts
- build-and-run.sh: Automates building JARs and spinning up your containers  
- cleanup.sh: Stops and removes containers, images, and volumes  
- verify-env.sh / check-services.sh: Validate network connectivity between microservices  

## Post-Deployment
- Check logs, readiness/liveness probes, dashboards, and run test queries
- Use test-endpoints.sh and test-network.sh to confirm the environment is working as expected