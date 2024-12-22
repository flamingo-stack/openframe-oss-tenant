# Deployment Guide

Explains how to build, configure, and deploy the OpenFrame platform 
in different environments (local, staging, production).

## Prerequisites & Overview
- Java 21, Maven 3.9+, Docker & Compose, Kubernetes  
- Credentials for environment secrets, container registry access
- The OpenFrame “scripts” directory automates most build and deployment steps.

## Build Steps
1. Clone the repository  
2. (Optional) If you prefer a manual build:
   ```bash
   mvn clean install
   cd services/openframe-ui
   npm install
   npm run build
   ```
3. For end-to-end deployment, simply run the script:
   ```bash
   ./scripts/build-and-run.sh
   ```
   This will:
   - Build all JARs using Maven
   - Optionally compile the frontend (if integrated)
   - Spin up containers via Docker Compose (infrastructure + services)
   - Wait for services to become healthy
4. Check container status with:
   ```bash
   docker ps
   scripts/check-services.sh
   ```

## Configuration
- Environment variables for each service (SPRING_PROFILES_ACTIVE, etc.)  
- External YAML configs (NiFi, Kafka, etc.)
- The scripts directory includes various helpers (test-network.sh, test-endpoints.sh) for validation.

## Deployment Scenarios
- Local Docker Compose: The default approach from build-and-run.sh (or manual compose up)  
- Kubernetes (Helm chart or custom manifests)  
- More advanced topologies (Istio, multi-tenant infra, etc.)

## Using Automated Scripts
- build-and-run.sh: Automates building JARs and spinning up containers  
- cleanup.sh: Stops/removes containers, images, and volumes  
- verify-env.sh / check-services.sh: Validate network connectivity  
- test-endpoints.sh: Simple cURL-based API checks

## Post-Deployment
- Check logs, readiness/liveness probes, dashboards, and run test queries
- Use test-endpoints.sh and test-network.sh to confirm everything is working