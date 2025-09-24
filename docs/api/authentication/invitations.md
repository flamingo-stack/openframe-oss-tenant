# Invitations Architecture

This document describes the invitation flow between the API service and the Authorization Server, and the shared models
to be placed in the library.

## Goals

- Allow inviting a user to the single-tenant environment (tenant not specified by clients).
- Invitations are valid for 24 hours.
- API service issues invitations and will publish an event to Kafka for the Authorization Server to materialize the
  tenant-scoped invitation (future work).
- Registration/acceptance endpoint lives in the Authorization Server.

## High-level Flow

1. Admin creates an invitation in the API service:
    - POST /invitations with email and roles only (names unknown at this point).
    - API service generates an invitation with 24h expiration.
    - API returns the invitation payload.
    - Future: API publishes `invitation-created` Kafka event consumed by the Authorization Server.
2. Authorization Server:
    - Listens to `invitation-created` and stores an `AuthInvitation` (tenant-scoped), using tenant context and generated
      ID.
    - Exposes a registration endpoint that accepts an invitation token/ID and completes user registration in the tenant.

## Shared Models (to be added to library)

Define a base, tenant-agnostic invitation model used by services inside the same cluster, and a tenant-aware model for
the Authorization Server. Do not duplicate fields across services beyond tenant-specific ones.

Proposed package: `com.openframe.data.document.invitation`

- Base model (used by internal services):

```java
package com.openframe.data.document.invitation;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.List;

import com.openframe.data.document.user.UserRole;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "invitations")
public class Invitation {
    @Id
    private String id;

    @Indexed
    private String email;

    // Names are not provided at creation time; captured later upon registration
    private List<UserRole> roles;

    private Instant expiresAt; // 24h validity

    @Builder.Default
    private InvitationStatus status = InvitationStatus.PENDING; // enum

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;
}
```

- Tenant-scoped model (Authorization Server only):

```java
package com.openframe.data.document.invitation;

import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.experimental.SuperBuilder;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@EqualsAndHashCode(callSuper = true)
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "invitations")
@CompoundIndex(def = "{'tenantId': 1, 'email': 1}")
public class AuthInvitation extends Invitation {
    @Indexed
    private String tenantId;
}
```

Notes:

- Authorization Server will populate `tenantId` / `tenantDomain` via tenant context when consuming events.
- Both share the physical collection name `invitations` to match existing conventions.

## API Service Endpoints

- `POST /invitations`: Create 24h invitation. Returns `InvitationResponse` containing metadata and expiration.
- `GET /invitations?page&size`: Paginated list of invitations. Returns `InvitationPageResponse { items, page, size, totalElements, totalPages, hasNext }`.
- `PATCH /invitations/{id}`: Update invitation status (use for revoke). Body:
  ```json
  {
    "status": "REVOKED"
  }
  ```
  Rules:
  - Allowed transition: `PENDING -> REVOKED`
  - Idempotent: if already `REVOKED` and request is `REVOKED`, returns current invitation
  - Errors: 404 (not found), 400 (missing/invalid status), 409 (invalid transition)

Future additions:

- `GET /invitations/:id` (optional): Retrieve status.
- `POST /invitations/:id/revoke` (optional): Revoke invitation.

## Authorization Server Endpoints

- `POST /oauth/invitations/register`: Accept invitation and register the user in the current tenant (from context). Validations:
  - Invitation exists and has status PENDING
  - Invitation not expired (expiresAt > now)
  - User email is not already active in another tenant
  - On success: create `AuthUser` and mark invitation as ACCEPTED

## Kafka Events (future)

- Topic: `identity-invitations-created`
- Key: `invitationId`
- Value: Invitation payload (base model fields) + immutable metadata (createdAt, expiresAt).
- AS consumer materializes `AuthInvitation` with tenant context.

## Security Considerations

- Invitations must be single-use and time-bound (24h). Upon acceptance, mark as `ACCEPTED`.
- On expiration, mark as `EXPIRED`; AS should reject expired invitations during registration.
- Do not leak tenant identifiers from API; AS assigns tenant fields.

## Status & Next Steps

- API endpoints implemented: create + paginated list.
- Invitation registration endpoint implemented in Authorization Server.
- Next: Produce Kafka event to synchronize with Authorization Server.


