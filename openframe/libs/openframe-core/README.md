# OpenFrame Core Library

The OpenFrame Core library contains shared code used across multiple microservices in the platform.

## What’s in Here?
- Shared Entities and Models:
  * CoreEvent, Event, Machine, OAuthToken, and more for consistent data structures across services.
- Basic Controllers and Services:
  * CoreController for minimal endpoints (like /api/core/health).
  * CoreService with baseline event processing logic.
- Optional Dockerfile:
  * While typically distributed as a JAR, you can also containerize openframe-core for debugging or custom tasks.
- Optional Security & Certificates:
  * public.pem and private.pem in src/main/resources/certs for token signing or encryption strategies.

## Key Files
- Dockerfile: Packaging the library if needed (though libraries typically aren’t containerized).  
- pom.xml: Coordinates shared dependencies.  

## Usage
• Added as a Maven/Gradle dependency in other services (like openframe-api, openframe-stream, etc.).  
• Provides a consistent code foundation to avoid duplication of core logic.

## Development
• Make changes here carefully to avoid breaking dependent services.  
• Run mvn clean install to publish updates to the local Maven repo.  
• Review version numbers to ensure services can pick up updates.

## Testing
• Use JUnit or similar frameworks for any shared logic.  
• If integration tests exist, they may rely on ephemeral test containers or local test DBs.
