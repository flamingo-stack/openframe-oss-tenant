# Api Configuration

Api Configuration establishes the service-wide REST contract and trusted caller binding for Openframe External Api Service Core.

## Components

- [`ExternalApiJacksonConfig`](https://github.com/flamingo-stack/openframe-oss-lib/blob/16e7c1cbd9664e7d10ec5ebca7d53c9bd314decf/openframe-external-api-service-core/src/main/java/com/openframe/external/config/ExternalApiJacksonConfig.java) installs an `Instant` serializer. It truncates values to milliseconds and always emits three fractional digits in UTC, avoiding write-read precision differences caused by MongoDB millisecond storage.
- [`OpenApiConfig`](https://github.com/flamingo-stack/openframe-oss-lib/blob/16e7c1cbd9664e7d10ec5ebca7d53c9bd314decf/openframe-external-api-service-core/src/main/java/com/openframe/external/config/OpenApiConfig.java) configures the OpenAPI document, API-key security scheme, gateway-relative server address, documentation group, and shared error responses.
- [`ExternalApiWebConfig`](https://github.com/flamingo-stack/openframe-oss-lib/blob/16e7c1cbd9664e7d10ec5ebca7d53c9bd314decf/openframe-external-api-service-core/src/main/java/com/openframe/external/web/ExternalApiWebConfig.java) registers the MVC argument resolver.
- [`ApiCallerArgumentResolver`](https://github.com/flamingo-stack/openframe-oss-lib/blob/16e7c1cbd9664e7d10ec5ebca7d53c9bd314decf/openframe-external-api-service-core/src/main/java/com/openframe/external/web/ApiCallerArgumentResolver.java) creates `ApiCaller` values from gateway-injected user and API-key identifiers.

## Contract Rules

The OpenAPI group matches `/api/v1/**` and `/tools/**`. It excludes actuator and core API paths. All grouped operations receive shared descriptions for invalid requests, missing or invalid keys, rate limiting, and internal errors.

The resolver trusts only headers added by the gateway after validation. Its role is context propagation for logging and principal resolution; it is not an authentication implementation.

```mermaid
flowchart LR
    Gateway["Validated Gateway Request"] --> Headers["Trusted Identity Headers"]
    Headers --> Resolver["ApiCaller Argument Resolver"]
    Resolver --> Controller["REST Controller"]
    Controller --> Principal["Domain Principal Resolution"]
```
