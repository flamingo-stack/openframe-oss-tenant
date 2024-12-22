# OpenFrame Config

Central location for various YAML configuration files controlling the behavior of OpenFrame services.

## Structure
- application.yml, application-docker.yml, etc.: Base properties for Spring Boot services.  
- openframe-api.yml, openframe-gateway.yml: Service-specific overrides or environment variables.  
- openframe-*local.yml or *docker.yml: Distinguish local development config from container-based config.

## Usage
1. Each microservice typically references these files at startup (via Spring’s config location).  
2. Adjust these files to set up service ports, database URLs, or external service endpoints.  
3. Docker Compose references these for environment variables or volume mounts.

## Notes
• Keep sensitive credentials (passwords, keys) in external environment variables or a secrets manager for production use.  
• The different “profiles” (e.g., local, docker) make it easier to run in distinct environments.  
• Verify the correct config profile is activated (e.g., spring.profiles.active=docker).