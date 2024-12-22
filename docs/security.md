# Security Overview

OpenFrame applies multiple security layers, from authentication 
to encryption and data protection.

## Authentication & Authorization
- OAuth2 + JWT tokens  
- Tenant-based isolation (each user belongs to a tenant)

## Data Encryption
- AES-256 for sensitive data at rest  
- TLS/SSL for transport encryption

## Access Control
- Role-based access within GraphQL resolvers  
- Cross-tenant checks  
- Spring Security integration

## Audit Logging
- Writes critical events to Cassandra or a specialized audit store  
- Tracks changes to accounts, roles, or configurations

## Rate Limiting & Circuit Breaking
- Redis-based rate limiter  
- Resilience4j or Spring Cloud for fallback logic

## Compliance & Governance
- Logging + data retention policies  
- Alerts for suspicious access patterns, performance anomalies 