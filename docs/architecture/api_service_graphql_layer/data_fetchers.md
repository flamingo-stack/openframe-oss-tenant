# Data Fetchers

The **Data Fetchers** module is the GraphQL execution layer of the API Service. It bridges incoming GraphQL queries and mutations with domain services, mappers, and persistence layers.

Built on top of Netflix DGS, this module defines query and mutation resolvers for core OpenFrame entities such as Devices, Events, Logs, Organizations, and Integrated Tools. It is responsible for:

- Translating GraphQL inputs into domain filter options
- Executing cursor-based paginated queries
- Delegating business logic to domain services
- Coordinating DataLoader-based batching to prevent N+1 issues
- Mapping domain models into GraphQL connection types

This module is part of the [API Service GraphQL Layer](../api_service_graphql_layer.md) and works closely with the sibling [Data Loaders](../data_loaders/data_loaders.md) module.

---

## Architectural Overview

At runtime, Data Fetchers sit between the GraphQL schema and the domain/service layer.

```mermaid
flowchart TD
    Client["GraphQL Client"] --> Schema["GraphQL Schema"]
    Schema --> Fetcher["Data Fetchers"]
    Fetcher --> Mapper["GraphQL Mappers"]
    Fetcher --> Service["Domain Services"]
    Service --> Persistence["Mongo Repositories / Pinot / Cassandra"]
    Fetcher --> DataLoaderLayer["Data Loaders"]
```

### Responsibilities by Layer

- **GraphQL Client**: Sends queries and mutations
- **Data Fetchers**: Resolve queries and nested fields
- **GraphQL Mappers**: Convert inputs to filter criteria and results to connection types
- **Domain Services**: Contain business logic and data access orchestration
- **Data Loaders**: Batch and cache nested entity lookups
- **Persistence Layer**: MongoDB, Pinot, Cassandra, and other data stores

---

# Core Components

## Device Data Fetcher

Handles GraphQL operations related to devices (machines).

### Queries

- `deviceFilters(filter)` → Returns dynamic filter options
- `devices(filter, pagination, search, sort)` → Returns cursor-based connection
- `device(machineId)` → Returns single machine by ID

### Nested Field Resolvers (Machine)

Uses DataLoader to resolve relationships efficiently:

- `tags`
- `toolConnections`
- `installedAgents`
- `organization`

### Device Query Flow

```mermaid
flowchart TD
    Query["devices query"] --> Mapper["GraphQLDeviceMapper"]
    Mapper --> FilterOptions["DeviceFilterOptions"]
    Mapper --> PaginationCriteria["CursorPaginationCriteria"]
    FilterOptions --> Service["DeviceService.queryDevices()"]
    PaginationCriteria --> Service
    Service --> Result["CountedGenericQueryResult"]
    Result --> Mapper
    Mapper --> Connection["CountedGenericConnection"]
```

### Nested Data Resolution

```mermaid
flowchart LR
    Machine["Machine"] --> Tags["tagDataLoader"]
    Machine --> ToolConn["toolConnectionDataLoader"]
    Machine --> Agents["installedAgentDataLoader"]
    Machine --> Org["organizationDataLoader"]
```

This prevents N+1 query issues by batching ID-based lookups per request.

---

## Event Data Fetcher

Responsible for event retrieval and mutation operations.

### Queries

- `events(filter, pagination, search, sort)`
- `eventById(id)`
- `eventFilters(filter)`

### Mutations

- `createEvent(input)`
- `updateEvent(id, input)`

### Event Query Flow

```mermaid
flowchart TD
    Query["events query"] --> Mapper["GraphQLEventMapper"]
    Mapper --> FilterOptions["EventFilterOptions"]
    Mapper --> PaginationCriteria["CursorPaginationCriteria"]
    FilterOptions --> Service["EventService.queryEvents()"]
    PaginationCriteria --> Service
    Service --> Result["GenericQueryResult"]
    Result --> Mapper
    Mapper --> Connection["GenericConnection"]
```

### Mutation Flow

```mermaid
flowchart TD
    Mutation["createEvent"] --> Builder["Event.builder()"]
    Builder --> Service["EventService.createEvent()"]
    Service --> Persisted["Event Document"]
```

Event mutations construct domain objects and delegate persistence to the EventService.

---

## Log Data Fetcher

Handles audit log retrieval with advanced filtering and cursor-based pagination.

### Queries

- `logFilters(filter)`
- `logs(filter, pagination, search, sort)`
- `logDetails(ingestDay, toolType, eventType, timestamp, toolEventId)`

### Log Query Flow

```mermaid
flowchart TD
    Query["logs query"] --> Mapper["GraphQLLogMapper"]
    Mapper --> FilterOptions["LogFilterOptions"]
    Mapper --> PaginationCriteria["CursorPaginationCriteria"]
    FilterOptions --> Service["LogService.queryLogs()"]
    PaginationCriteria --> Service
    Service --> Result["Query Result"]
    Result --> Mapper
    Mapper --> Connection["GenericConnection"]
```

`logDetails` performs a targeted lookup using compound identifiers such as ingest day and tool event ID.

---

## Organization Data Fetcher

Exposes organization-level queries.

### Queries

- `organizations(filter, pagination, search, sort)`
- `organization(id)`
- `organizationByOrganizationId(organizationId)`

### Organization Query Flow

```mermaid
flowchart TD
    Query["organizations query"] --> Mapper["GraphQLOrganizationMapper"]
    Mapper --> FilterOptions["OrganizationFilterOptions"]
    Mapper --> PaginationCriteria["CursorPaginationCriteria"]
    FilterOptions --> Service["OrganizationQueryService.queryOrganizations()"]
    PaginationCriteria --> Service
    Service --> Result["CountedGenericQueryResult"]
    Result --> Mapper
    Mapper --> Connection["CountedGenericConnection"]
```

This separates read-optimized query logic from write-oriented organization services.

---

## Tools Data Fetcher

Handles integrated tool discovery and filtering.

### Queries

- `integratedTools(filter, search, sort)`
- `toolFilters()`

### Tools Query Flow

```mermaid
flowchart TD
    Query["integratedTools query"] --> Mapper["GraphQLToolMapper"]
    Mapper --> FilterOptions["ToolFilterOptions"]
    FilterOptions --> Service["ToolService.queryTools()"]
    Service --> Result["ToolList"]
```

Unlike device and event queries, tools do not use cursor pagination in this implementation.

---

# Cursor-Based Pagination Model

Most collection queries implement cursor-based pagination using shared DTOs.

```mermaid
flowchart LR
    Input["CursorPaginationInput"] --> Criteria["CursorPaginationCriteria"]
    Criteria --> Service["Query Service"]
    Service --> QueryResult["GenericQueryResult"]
    QueryResult --> Connection["GenericConnection or CountedGenericConnection"]
```

Key characteristics:

- Forward and backward pagination support
- Stable sorting via `SortInput`
- Search term support
- Total count support for certain entities

---

# DataLoader Integration

The Data Fetchers module relies on the sibling [Data Loaders](../data_loaders/data_loaders.md) module for batching and caching.

### Why DataLoader?

Without batching:

- Fetch 50 machines
- Fetch tags for each machine individually
- 50 additional database calls

With DataLoader:

- Collect all machine IDs
- Execute one batched query
- Distribute results back to individual resolvers

### Execution Model

```mermaid
sequenceDiagram
    participant Client
    participant Fetcher
    participant DataLoader
    participant Repository

    Client->>Fetcher: Query devices with tags
    Fetcher->>DataLoader: load(machineId1)
    Fetcher->>DataLoader: load(machineId2)
    DataLoader->>Repository: batchLoad([id1, id2])
    Repository-->>DataLoader: Results
    DataLoader-->>Fetcher: Individual tag lists
```

This design ensures high performance and predictable database load.

---

# Validation and Input Handling

Each Data Fetcher:

- Uses `@Valid` for DTO validation
- Applies `@NotBlank` for required scalar inputs
- Logs structured debug statements
- Delegates business logic to services

The module deliberately avoids embedding domain logic. Its responsibilities are:

- Input transformation
- Delegation
- Result mapping
- Nested field resolution

---

# How Data Fetchers Fit into the System

```mermaid
flowchart TD
    Frontend["Frontend Clients"] --> Gateway["Gateway Service"]
    Gateway --> ApiService["API Service"]
    ApiService --> GraphQLLayer["GraphQL Layer"]
    GraphQLLayer --> DataFetchers["Data Fetchers"]
    DataFetchers --> DomainServices["Domain Services"]
    DomainServices --> DataLayer["Mongo / Pinot / Cassandra"]
```

Within the API Service:

- **REST Controllers** handle HTTP endpoints
- **Data Fetchers** handle GraphQL queries and mutations
- **Domain Services** implement business rules
- **Repositories** handle persistence

The Data Fetchers module therefore acts as the execution engine of the GraphQL API.

---

# Summary

The **Data Fetchers** module:

- Implements GraphQL query and mutation resolvers
- Converts GraphQL inputs into domain-level filter criteria
- Provides cursor-based pagination
- Uses DataLoader for efficient nested resolution
- Delegates business logic to domain services
- Maps domain results into GraphQL connection types

It is a thin but critical orchestration layer that enables a scalable, strongly-typed GraphQL API across devices, events, logs, organizations, and integrated tools.
