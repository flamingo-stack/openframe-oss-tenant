# OpenFrame Data Library

Similar to openframe-core but more focused on data-access logic, queries, and database migrations shared by multiple services.

## Purpose
• Common data access objects or repositories for MongoDB, Cassandra, or Pinot.  
• Reusable logic for connecting to data sources, schema definitions, migrations, etc.  

## Key Files
- pom.xml: Build file for library dependencies and deliverables.  
- Dockerfile: Typically for local testing or an ephemeral environment, if needed.

## Usage
• Used by openframe-api, openframe-stream, or other microservices that require uniform data logic.  
• Consolidates data handling so each microservice follows the same patterns.

## Examples
• Data repositories implementing Spring Data or custom queries.  
• Utility classes for schema migration tasks (flyway, liquibase, or custom scripts).

## Development
• Update carefully to prevent schema mismatches across services.  
• Ensure test coverage for new migrations or data-access logic.
