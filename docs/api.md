# API Documentation

Describes how to interact with the OpenFrame APIs, focusing on the primary 
GraphQL interface and any optional REST endpoints.

## Project Reference
The main OpenFrame API service is found in [services/openframe-api](../services/openframe-api).
It uses Spring Boot and Netflix DGS to serve GraphQL endpoints and optional REST routes.
For build/deployment steps, see [docs/deployment.md](deployment.md).

## GraphQL API
- Endpoint: /graphql  
- Tools: Netflix DGS, schema files, resolvers, data loaders  
- Authentication: JWT (Bearer token)  
- Common queries and mutations

## Optional REST Endpoints
- Some services may expose additional REST endpoints  
- Required headers and authentication details  
- Example requests and responses

## Schema & Tooling
- Location of .graphql schema  
- GraphiQL, Postman usage

## Error Handling
- Common error codes or GraphQL error structures 