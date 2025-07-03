# OpenFrame Gateway

OpenFrame Gateway is an authentication proxy and unified entry point for multiple microservices and integrated tools in the OpenFrame ecosystem.

## Purpose

* Validates JWT tokens for all incoming requests to OpenFrame services
* Serves as the central routing layer for all OpenFrame services and integrated tools
* Proxies requests to integrated tools through a unified interface
* Supports both REST and WebSocket communication protocols
* Provides headers translation from JWT claims to downstream services

## Key Components

* **JWT Validation**: Authenticates requests using JWT tokens from OpenFrame services
* **Service Routing**: Routes requests to appropriate microservices based on path patterns
* **Tool Proxying**: Provides transparent access to integrated tools
* **WebSocket Support**: Handles WebSocket connections for real-time communication
* **Header Translation**: Extracts JWT claims and forwards as HTTP headers

## Key Files

* `GatewaySecurityConfig.java`: Configures security and authentication
* `ReactiveJwtAuthenticationFilter.java`: Validates JWT tokens for requests
* `JwtToHeadersFilter.java`: Converts JWT claims to HTTP headers
* `RestProxyService.java`: Proxies REST requests to integrated tools
* `WebSocketGatewayConfig.java`: Manages WebSocket routing and connections
* `IntegrationService.java`: Provides tool integration and discovery functionality
* `ProxyUrlResolver.java`: Resolves target URLs for tool proxying

## Running Locally

1. Before running locally, be sure that Telepresence is connected:
   ```
   mvn spring-boot:run -Dspring-boot.run.profiles=k8s
   ```

## Endpoints

* Service Routing:
  * `/api/**`: Routes to OpenFrame API service
  * `/clients/**`: Routes to OpenFrame Client service
  * `/`: Routes to OpenFrame UI service

* Tool Integration:
  * `/tools/{toolId}/**`: Proxies API requests to integrated tools
  * `/tools/agent/{toolId}/**`: Proxies agent requests to integrated tools
  * `/ws/tools/{toolId}/**`: Manages WebSocket connections to integrated tools
  * `/ws/tools/agent/{toolId}/**`: Manages agent WebSocket connections

## Architecture

* Acts as a central entry point for all services within the OpenFrame ecosystem
* Implements reactive programming model using Spring WebFlux
* Uses JWT-based security with different authentication models for users and agents
* Forwards authenticated requests to appropriate microservices
* Maintains secure connections to integrated tools

## Additional Notes

* **CORS Support**: Implements cross-origin resource sharing for web clients
* **Security**: Supports different authorization scopes for API vs agent access
* **Logging**: Includes detailed request logging with curl command generation
* **Timeout Management**: Configures appropriate timeouts for proxied connections
