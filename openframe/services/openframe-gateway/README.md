# OpenFrame Gateway

OpenFrame Gateway is an authentication proxy and unified entry point for multiple open-source tools and microservices in the OpenFrame ecosystem.

## Purpose
• Layer an OAuth-based security mechanism over third-party dashboards and APIs (e.g., Grafana, Fleet, or custom tools).  
• Route and load-balance requests to each service from a single domain.  
• Optionally unify endpoints (GraphQL, REST) for external consumers.  

## Key Files
- GatewayApplication.java: Spring Boot application entry point.  
- SecurityConfig.java: Configures OAuth and other security aspects.  
- IntegrationService.java: Example logic for discovering or proxying integrated tools.  

## Running
• Use openframe-gateway-docker.yml with Docker Compose, or run locally via Spring Boot:  
  » mvn spring-boot:run  

## Configuration
• May read From openframe/config/openframe-gateway-*.yml files to set up route definitions, OAuth providers, or integrated tool endpoints.  
• Typically sits behind a domain like gateway.openframe.local.

## Observability
• Exposes standard Spring Boot actuator endpoints and custom metrics for gateway traffic.  
• Includes logs for inbound and outbound requests to integrated tools. 