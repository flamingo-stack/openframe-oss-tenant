# Release Version Request DTO

The **ReleaseVersionRequest** DTO represents the payload sent to the management service when a cluster reports its current release version.

## Purpose

- Encapsulate cluster image or release version information
- Provide a stable contract for deployment automation

This DTO is intentionally minimal to reduce coupling between deployment tooling and internal domain models.

## Structure

```java
@Data
public class ReleaseVersionRequest {

    private String imageTagVersion;

}
```

## Field Semantics

| Field | Description |
|------|-------------|
| imageTagVersion | Container image tag or semantic version string |

## Usage Context

- Consumed by **ReleaseVersionController**
- Processed by **ReleaseVersionService**
- Often populated by CI/CD pipelines or cluster agents

## Design Notes

- No validation annotations at DTO level
- Validation and interpretation are deferred to the service layer
- Supports flexible versioning schemes (tags, SHAs, semantic versions)

This keeps the management API adaptable as deployment strategies evolve.
