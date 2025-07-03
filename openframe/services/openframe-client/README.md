# OpenFrame Client

OpenFrame Client is the service responsible for agent management, authentication, and tool connections in the OpenFrame ecosystem.

## Purpose

* Manages agent registration and authentication via JWT token issuance
* Provides agent authentication through a simplified token endpoint
* Handles tool connections between agents and various tools
* Provides REST APIs for client and agent management
* Supports WebSocket connections for real-time metrics

## Key Components

* **Agent Authentication**: Simple JWT token generation for agent security
* **Tool Connections**: Managing connections between agents and various tools (MeshCentral, Fleet, etc.)
* **Client Credentials**: APIs for creating and managing authentication client entries
* **Tagging System**: Categorization and organization of machines

## Key Files

* `AgentController.java`: Handles agent registration and tool connections
* `AgentAuthController.java`: Implements token endpoints for agents
* `ClientManagementController.java`: Manages authentication clients
* `MetricsWebSocketController.java`: Processes real-time metrics via WebSockets
* `AgentService.java`: Core business logic for agent operations
* `ToolConnectionService.java`: Manages tool connection states and operations
* `TagService.java`: Implements machine tagging functionality

## Running Locally

1. Ensure MongoDB is running (required for storing agents, clients, and tool connections).
2. Before running locally, be sure that Telepresence is connected for Kubernetes integration:
   ```
   mvn spring-boot:run -Dspring-boot.run.profiles=k8s
   ```

## Endpoints

* Agent Management: `/api/agents/**` (registration, tool connections)
* Authentication: `/oauth/token` (agent token issuance)
* Client Management: `/api/clients/**` (client credential CRUD)
* WebSocket: Support for real-time metric reporting

## Architecture

* The Client service is accessed through the Gateway, which routes requests with the `/clients/**` path pattern.
* Integrates with MongoDB for persistence of agents, clients, and tool connections.
* Uses JWT for secure authentication.
* Implements WebSocket protocol for real-time agent communication.

## Additional Notes

* **Logging**: Uses SLF4J with Lombok @Slf4j annotations for standardized logging.
* **Security**: Provides JWT token generation for agent authentication via a simplified token endpoint.
* **Tool Types**: Supports connections to different tool types through the ToolType enumeration.
