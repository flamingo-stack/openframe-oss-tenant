# OpenFrame Core Library

The OpenFrame Core library contains shared code used across multiple microservices in the platform.

## Contents
• Common models (DTOs, Entities).  
• Utility classes for logging, error handling, or custom annotations.  
• Possibly some base Spring configuration classes used by each microservice.

## Key Files
- Dockerfile: Packaging the library if needed (though libraries commonly aren’t containerized).  
- pom.xml: Coordinates shared dependencies.  

## Usage
• Added as a Maven/Gradle dependency in other services (like openframe-api, openframe-stream, etc.).  
• Provides a consistent code foundation to avoid duplication of core logic.

## Development
• Make changes here carefully to avoid breaking dependent services.  
• Run mvn clean install to publish updates to the local Maven repo. 