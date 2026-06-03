# Customer naming convention

> The frontend uses **"Customer"** everywhere. The backend still sends **"organization"**. This document explains why and how to work with the mismatch.

## TL;DR

| Layer | Name |
|---|---|
| UI text shown to users | **Customer** / **Customers** |
| Frontend routes (`/customers/...`) | **customer(s)** |
| Frontend folder / file names | **customer(s)** |
| Frontend component / hook / type names | **Customer** / `useCustomer*` |
| Frontend local variables | **customer** |
| REST endpoints (`/api/organizations/*`) | **organization** (backend) |
| GraphQL query fields (`organizations`, `organizationId`, `organizationName`, `organizationImage`) | **organization** (backend) |
| `OrganizationCard`, `OrganizationIcon` (imports from core library) | **Organization** (external lib) |
| Auth flow (signup / login / invite) | **Organization** — refers to the MSP itself, not its clients |

## Why the backend still says "organization"

OpenFrame's backend domain model was originally designed around the term **Organization**. That model is used by every microservice (`openframe-api`, `openframe-management`, etc.), the GraphQL schema, MongoDB collections, Kafka topics and the Cassandra/Pinot data pipelines. Renaming it backend-wide is a substantial migration that touches:

- GraphQL schema (`schema.graphql`) and all Java DGS data fetchers
- REST controllers and DTOs
- Database collections (MongoDB stores `organizations`)
- Data pipeline (Kafka topic names, Cassandra/Pinot table schemas)
- Kubernetes / Helm manifests and integrated-tools connectors (Tactical RMM, Fleet MDM, MeshCentral, Authentik) that reference org IDs
- The Rust client which authenticates against `/api/organizations/...`

That migration is **not scheduled**. To unblock the UX rebrand without a coordinated backend release, the frontend translates at the API boundary:

```
┌────────────────────────────────────────────────────────────────────┐
│                          UI / components                          │
│      Customer, useCustomers, CustomersTable, /customers/...       │
└──────────────────────────┬─────────────────────────────────────────┘
                           │ map at the boundary
┌──────────────────────────▼─────────────────────────────────────────┐
│                  API layer (talks to backend)                      │
│  GET  /api/organizations/{id}                                      │
│  query { organizations { edges { node { organizationId, name } }}} │
└────────────────────────────────────────────────────────────────────┘
```

## Where the boundary lives

The translation happens in **`src/app/(app)/customers/hooks/`**:

| File | Role |
|---|---|
| `use-customers.ts` | Calls GraphQL `organizations` query, maps `OrganizationNode` → `Customer` via `mapOrganizationNode` |
| `use-customer-details.ts` | Fetches a single customer by org ID, maps to `CustomerDetails` |
| `use-customer-archive.ts` | Calls `PATCH /api/organizations/{id}/status` |
| `use-customer-device-counts.ts` | Calls GraphQL `deviceFilters.organizationIds` |
| `use-create-customer.ts` / `use-update-customer.ts` / `use-delete-customer.ts` | REST `/api/organizations/{id}` |
| `queries/customers-queries.ts` | Raw GraphQL queries — field names stay `organizations`, `organizationId` (backend schema) |

Inside these files you'll see `organizationId`, `organizationsQueryKeys` (cache keys), and raw GraphQL field names. **That's intentional** — those names map directly to backend wire format. Once data crosses the hook boundary into a component, it's exposed as `Customer` / `customer`.

## Rules for new code

1. **In components, pages, stores, utils:** use `customer`, `Customer`, `CustomerSomething`.
2. **In API hooks:** keep `organizationId` etc. when they correspond to GraphQL/REST field names. Map to `customer*` shape before returning from the hook.
3. **In URLs:** use `/customers/...`. Never write `/organizations/...` in `router.push` or `<Link href>`.
4. **In imports from `@flamingo-stack/openframe-frontend-core`:** do **not** rename `OrganizationCard`, `OrganizationIcon`, `OrganizationsIcon`, `OrganizationFilterOption`. They are external library exports.
5. **In Auth pages (`src/app/(auth)/`):** continue using **"Organization"** in the visible UI. That flow is about the MSP company registering itself, not about managing customer records.
6. **`organizationId` is allowed as a prop / parameter name** when the value is the backend's organization ID — even on the customer side. Don't invent `customerId` aliases for the same value; it makes grepping harder.

## What still says "Organization" intentionally

- `OrganizationNode`, `mapOrganizationNode` (in `use-customers.ts`) — represent the raw GraphQL response shape; keeping the name documents that the data comes from the backend's `Organization` type.
- React Query cache keys: `['organizations', ...]`. Keys don't appear in the UI, and changing them would invalidate any persisted cache without benefit.
- All GraphQL queries (`GET_ORGANIZATIONS_QUERY`, `UNLINK_ORGANIZATION_FROM_TICKET_MUTATION`, etc.) — backend field names.
- All REST paths under `/api/organizations/`.
- Auth pages: "Create Organization", "Organization Name", "Switch Organization?" — these are about the MSP signing up, not about managing customer records.

## When the backend catches up

If/when the backend renames its domain model, the migration is:

1. Backend ships a new schema (`customers` query, `customerId` field) alongside the old one.
2. Frontend hooks switch from `GET_ORGANIZATIONS_QUERY` to `GET_CUSTOMERS_QUERY` and drop the `mapOrganizationNode` boundary mapping.
3. Old endpoints get deprecated; eventually removed.

Until then, treat the "Customer" name as a **UI/UX-only rebrand with a translation layer in the API hooks**.