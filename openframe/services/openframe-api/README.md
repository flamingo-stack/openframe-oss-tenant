# OpenFrame API

OpenFrame API is the core backend service for the OpenFrame platform, providing authentication, GraphQL data access, and OAuth/OpenID Connect functionality.

## Purpose

* Implements GraphQL endpoints for data access and manipulation
* Provides OAuth 2.0 authentication with multiple grant types
* Offers OpenID Connect discovery and userinfo endpoints
* Handles user registration and authentication
* Manages events and integrated tool information

## Key Components

* **OAuth Service**: Complete OAuth 2.0 implementation with multiple grant types
* **OpenID Connect**: Standard OIDC implementation with discovery and userinfo endpoints
* **JWT Integration**: Uses OpenFrame JWT library for token generation
* **GraphQL API**: Data access for events and integrated tools
* **Event Management**: Creation and tracking of system events

## Key Files

* `OAuthController.java`: Handles token issuance and user registration
* `OpenIDController.java`: Provides OpenID Connect functionality
* `HealthController.java`: Basic health check endpoint
* `EventDataFetcher.java`: GraphQL data fetcher for events
* `ToolsDataFetcher.java`: GraphQL data fetcher for integrated tools
* `OAuthService.java`: Core business logic for authentication
* `EventService.java`: Manages event creation and retrieval
* `OpenIDService.java`: Implements OpenID Connect standards

## Running Locally

1. Ensure MongoDB is running (required for storing users, OAuth clients, and events).
2. Redis and Cassandra are configured but may not be required for core functionality.
3. Before running locally with Kubernetes integration, connect Telepresence:
   ```
   mvn spring-boot:run -Dspring-boot.run.profiles=k8s
   ```

## Endpoints

* OAuth: `/oauth/token` (token issuance with multiple grant types)
* Registration: `/oauth/register` (user registration)
* Authorization: `/oauth/authorize` (OAuth authorization endpoint)
* OpenID Connect: `/.well-known/openid-configuration`, `/.well-known/userinfo`
* Health: `/health` (service health check)
* GraphQL: `/graphql` (data access endpoint with GraphiQL enabled)

## Architecture

* The API service is accessed through the Gateway, which routes requests with the `/api/**` path pattern.
* Integrates with MongoDB for persistence of users, events, and OAuth clients.
* Uses JWT for token-based authentication.
* Implements GraphQL for flexible data querying.

## Additional Notes

* **Logging**: Uses SLF4J with Lombok @Slf4j annotations for standardized logging.
* **Security**: Provides JWT token generation for user authentication via standard OAuth flows.
* **GraphiQL**: Includes GraphiQL UI for testing GraphQL queries (enabled by default).
