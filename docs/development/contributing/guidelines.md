# Contributing Guidelines

Welcome to OpenFrame! We're excited to have you contribute to the AI-powered MSP platform. This guide covers our development workflow, code standards, and contribution process.

## Getting Started

Before contributing, please:

1. **Join the Community**: [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
2. **Set Up Development Environment**: Follow the [Environment Setup Guide](../setup/environment.md)
3. **Understand the Architecture**: Read the [Architecture Overview](../architecture/README.md)
4. **Review Security Guidelines**: Check [Security Best Practices](../security/README.md)

## Code of Conduct

OpenFrame is committed to providing a welcoming and inclusive environment for all contributors. We expect all community members to:

- **Be respectful** of differing viewpoints and experiences
- **Accept constructive criticism** gracefully
- **Focus on what's best** for the community and platform
- **Show empathy** towards other community members
- **Use welcoming and inclusive language**

## Development Workflow

### Branch Strategy

We use a **Git Flow** inspired branching model:

```mermaid
gitgraph
    commit id: "main"
    branch develop
    checkout develop
    commit id: "dev-1"
    
    branch feature/device-management
    checkout feature/device-management
    commit id: "feat-1"
    commit id: "feat-2"
    checkout develop
    merge feature/device-management
    commit id: "dev-2"
    
    branch release/v1.2.0
    checkout release/v1.2.0
    commit id: "rel-1"
    checkout main
    merge release/v1.2.0
    tag: "v1.2.0"
    
    checkout develop
    merge main
```

### Branch Types

| Branch Type | Purpose | Naming Convention | Merge Target |
|-------------|---------|-------------------|--------------|
| **main** | Production releases | `main` | - |
| **develop** | Integration branch | `develop` | `main` |
| **feature** | New features | `feature/brief-description` | `develop` |
| **hotfix** | Critical bug fixes | `hotfix/issue-description` | `main` + `develop` |
| **release** | Release preparation | `release/v1.2.0` | `main` |

### Contribution Process

#### 1. Fork and Clone

```bash
# Fork the repository on GitHub, then clone your fork
git clone https://github.com/your-username/openframe-oss-tenant.git
cd openframe-oss-tenant

# Add upstream remote
git remote add upstream https://github.com/flamingo-stack/openframe-oss-tenant.git

# Verify remotes
git remote -v
```

#### 2. Create Feature Branch

```bash
# Update develop branch
git checkout develop
git pull upstream develop

# Create feature branch
git checkout -b feature/add-device-tagging

# Push branch to your fork
git push -u origin feature/add-device-tagging
```

#### 3. Make Changes

Follow our coding standards and best practices:

- Write clean, readable code
- Include comprehensive tests
- Update documentation
- Follow security guidelines
- Use meaningful commit messages

#### 4. Test Your Changes

```bash
# Run unit tests
mvn test

# Run integration tests
mvn verify -Pintegration-tests

# Check code coverage
mvn clean test jacoco:report

# Run security scans
mvn org.owasp:dependency-check:check

# Test frontend changes
cd openframe/services/openframe-frontend
npm run test
npm run build
```

#### 5. Create Pull Request

1. Push your changes to your fork
2. Open a Pull Request against `develop` branch
3. Fill out the PR template completely
4. Request review from maintainers

```bash
# Push final changes
git add .
git commit -m "feat: add device tagging functionality"
git push origin feature/add-device-tagging
```

## Code Standards

### Java Code Style

We follow **Google Java Style Guide** with some modifications:

#### Formatting Rules

**Indentation**: 4 spaces (not tabs)
**Line Length**: 120 characters maximum
**Braces**: K&R style (opening brace on same line)

```java
// ✅ Good
public class DeviceService {
    
    public DeviceResponse createDevice(CreateDeviceRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Request cannot be null");
        }
        
        return deviceRepository.save(Device.builder()
            .hostname(request.getHostname())
            .ipAddress(request.getIpAddress())
            .tenantId(getCurrentTenantId())
            .build());
    }
}

// ❌ Bad
public class DeviceService{
  public DeviceResponse createDevice(CreateDeviceRequest request){
if(request==null){
throw new IllegalArgumentException("Request cannot be null");}
return deviceRepository.save(Device.builder().hostname(request.getHostname()).ipAddress(request.getIpAddress()).tenantId(getCurrentTenantId()).build());}}
```

#### Naming Conventions

```java
// Classes: PascalCase
public class DeviceManagementService {}

// Methods and variables: camelCase
private String deviceHostname;
public void updateDeviceStatus() {}

// Constants: UPPER_SNAKE_CASE
public static final String DEFAULT_TIMEOUT = "30s";

// Packages: lowercase with dots
package com.openframe.api.service.device;
```

#### Documentation

Use JavaDoc for all public APIs:

```java
/**
 * Creates a new device in the specified organization.
 * 
 * @param request the device creation request containing hostname, IP, and organization ID
 * @return the created device response with generated ID and metadata
 * @throws OrganizationNotFoundException if the specified organization doesn't exist
 * @throws DuplicateHostnameException if a device with the same hostname already exists
 * @throws ValidationException if the request contains invalid data
 * 
 * @since 1.0.0
 */
@PreAuthorize("hasPermission(#request.organizationId, 'Organization', 'DEVICE_CREATE')")
public DeviceResponse createDevice(@Valid CreateDeviceRequest request) {
    // Implementation
}
```

### TypeScript/React Code Style

We use **Airbnb TypeScript Style Guide** with Prettier:

#### Component Structure

```typescript
// ✅ Good - Functional component with proper typing
import React, { useCallback, useMemo } from 'react';
import { Device, DeviceStatus } from '@/types/device';
import { formatDateTime } from '@/utils/date';
import { DeviceStatusBadge } from './DeviceStatusBadge';

interface DeviceCardProps {
  device: Device;
  onStatusChange: (deviceId: string, status: DeviceStatus) => void;
  className?: string;
}

export const DeviceCard: React.FC<DeviceCardProps> = ({
  device,
  onStatusChange,
  className = '',
}) => {
  const handleStatusChange = useCallback((newStatus: DeviceStatus) => {
    onStatusChange(device.id, newStatus);
  }, [device.id, onStatusChange]);

  const formattedLastSeen = useMemo(() => {
    return formatDateTime(device.lastSeen);
  }, [device.lastSeen]);

  return (
    <div className={`device-card ${className}`}>
      <h3 className="device-card__title">{device.hostname}</h3>
      <p className="device-card__ip">{device.ipAddress}</p>
      <DeviceStatusBadge
        status={device.status}
        onChange={handleStatusChange}
      />
      <span className="device-card__last-seen">
        Last seen: {formattedLastSeen}
      </span>
    </div>
  );
};
```

#### Naming Conventions

```typescript
// Components: PascalCase
export const DeviceStatusBadge = () => {};

// Hooks: camelCase starting with "use"
export const useDeviceStatus = () => {};

// Types/Interfaces: PascalCase
export interface DeviceResponse {
  id: string;
  hostname: string;
}

// Enums: PascalCase
export enum DeviceStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  MAINTENANCE = 'MAINTENANCE',
}

// Constants: UPPER_SNAKE_CASE
export const API_BASE_URL = 'https://api.openframe.ai';
```

### Database Schema Standards

#### MongoDB Collection Naming

```javascript
// ✅ Good - Plural, lowercase with hyphens for multi-word
db.devices
db.organizations  
db.audit-logs
db.user-sessions

// ❌ Bad
db.Device
db.auditLogs
db.user_session
```

#### Document Structure

```javascript
// ✅ Good - Consistent field naming and structure
{
  "_id": ObjectId("..."),
  "tenantId": "tenant-123",
  "hostname": "web-server-01",
  "ipAddress": "192.168.1.100",
  "status": "ONLINE",
  "organizationId": "org-456",
  "tags": ["production", "web-server"],
  "createdAt": ISODate("2024-01-15T10:30:00Z"),
  "updatedAt": ISODate("2024-01-15T10:30:00Z"),
  "metadata": {
    "osName": "Ubuntu",
    "osVersion": "22.04",
    "agentVersion": "1.2.3"
  }
}
```

## Commit Message Format

We follow **Conventional Commits** specification:

### Format Structure

```text
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

| Type | Description | Example |
|------|-------------|---------|
| **feat** | New feature | `feat(devices): add device tagging functionality` |
| **fix** | Bug fix | `fix(api): resolve device query timeout issue` |
| **docs** | Documentation changes | `docs(readme): update installation instructions` |
| **style** | Code style changes | `style(frontend): fix eslint warnings` |
| **refactor** | Code refactoring | `refactor(service): extract device validation logic` |
| **test** | Adding tests | `test(devices): add integration tests for device API` |
| **chore** | Maintenance tasks | `chore(deps): update spring boot to 3.2.0` |
| **perf** | Performance improvements | `perf(query): optimize device search performance` |
| **ci** | CI/CD changes | `ci(github): add automated security scanning` |

### Examples

**Feature Addition:**
```text
feat(devices): add bulk device import functionality

- Add CSV file parsing for device data
- Implement batch device creation API
- Add progress tracking for import jobs
- Include validation for duplicate hostnames

Closes #123
```

**Bug Fix:**
```text
fix(auth): resolve JWT token expiration handling

The token refresh mechanism was not properly handling expired tokens,
causing users to be logged out prematurely. This change implements
proper token validation and automatic refresh.

Fixes #456
```

**Breaking Change:**
```text
feat(api)!: change device API response format

BREAKING CHANGE: Device API now returns nested organization object
instead of just organizationId. Update client applications to use
device.organization.id instead of device.organizationId.

Closes #789
```

## Pull Request Guidelines

### PR Template

When creating a pull request, use this template:

```markdown
## Description

Brief description of the changes and the problem they solve.

Fixes #(issue number)

## Type of Change

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Security enhancement

## Testing

- [ ] Unit tests pass locally
- [ ] Integration tests pass locally
- [ ] Added new tests for changes (if applicable)
- [ ] Manual testing completed
- [ ] Security scan results reviewed

## Checklist

- [ ] My code follows the project's style guidelines
- [ ] I have performed a self-review of my code
- [ ] I have commented on my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
- [ ] Any dependent changes have been merged and published

## Screenshots (if applicable)

Include screenshots for UI changes.

## Additional Notes

Any additional information, context, or considerations for reviewers.
```

### Review Process

#### Automated Checks

All PRs must pass automated checks:

- **Build**: All services compile successfully
- **Tests**: Unit and integration tests pass
- **Coverage**: Code coverage meets minimum thresholds
- **Security**: OWASP dependency check passes
- **Lint**: Code style checks pass
- **Type Check**: TypeScript type checking passes

#### Human Review

PRs require at least **2 approvals** from maintainers:

1. **Technical Review**: Code quality, architecture, performance
2. **Security Review**: Security implications and best practices
3. **Documentation Review**: Updates to docs and comments

#### Review Checklist

**Code Quality:**
- [ ] Code is readable and well-structured
- [ ] No code duplication or overly complex functions
- [ ] Error handling is appropriate and consistent
- [ ] Performance considerations are addressed

**Security:**
- [ ] No hardcoded secrets or credentials
- [ ] Input validation is proper
- [ ] Authentication and authorization are correct
- [ ] No SQL injection or XSS vulnerabilities

**Testing:**
- [ ] Adequate test coverage for new code
- [ ] Tests are meaningful and test the right things
- [ ] Edge cases are covered
- [ ] Integration tests cover happy path and error scenarios

**Documentation:**
- [ ] Public APIs have proper documentation
- [ ] README files are updated if necessary
- [ ] Breaking changes are clearly documented
- [ ] Configuration changes are documented

## Issue Reporting

### Bug Reports

Use the bug report template:

```markdown
## Bug Description

A clear description of what the bug is.

## Steps to Reproduce

1. Go to '...'
2. Click on '...'
3. See error

## Expected Behavior

What you expected to happen.

## Actual Behavior

What actually happened.

## Environment

- OS: [e.g., Ubuntu 22.04]
- Browser: [e.g., Chrome 120.0]
- OpenFrame Version: [e.g., 1.2.3]

## Additional Context

Any other context about the problem.

## Screenshots

If applicable, add screenshots to help explain the problem.
```

### Feature Requests

Use the feature request template:

```markdown
## Feature Description

A clear description of what you want to happen.

## Use Case

Describe the use case and why this feature would be valuable.

## Proposed Solution

Describe how you think this should work.

## Alternatives Considered

Any alternative solutions or workarounds you've considered.

## Additional Context

Any other context or screenshots about the feature request.
```

## Development Best Practices

### Security First

- **Never commit secrets**: Use environment variables and secure vaults
- **Validate all inputs**: Implement proper input validation and sanitization
- **Follow authentication patterns**: Use established OAuth2/JWT patterns
- **Review dependencies**: Keep dependencies updated and scan for vulnerabilities

```bash
# Check for secrets before committing
git secrets --scan

# Scan dependencies
mvn org.owasp:dependency-check:check
npm audit
```

### Performance Considerations

- **Database queries**: Optimize queries and use proper indexing
- **Caching**: Implement appropriate caching strategies
- **Async processing**: Use async processing for expensive operations
- **Resource usage**: Monitor memory and CPU usage

```java
// ✅ Good - Async processing for expensive operations
@Async
public CompletableFuture<Void> processLargeDataset(List<Device> devices) {
    devices.parallelStream()
        .forEach(this::processDevice);
    return CompletableFuture.completedFuture(null);
}

// ✅ Good - Proper caching
@Cacheable(value = "devices", key = "#deviceId")
public Device getDevice(String deviceId) {
    return deviceRepository.findById(deviceId)
        .orElseThrow(() -> new DeviceNotFoundException(deviceId));
}
```

### Code Organization

- **Single Responsibility**: Each class/function should have one clear purpose
- **DRY Principle**: Don't repeat yourself - extract common functionality
- **SOLID Principles**: Follow SOLID design principles
- **Clean Architecture**: Maintain clear separation between layers

### Error Handling

```java
// ✅ Good - Proper exception handling with context
public DeviceResponse updateDevice(String deviceId, UpdateDeviceRequest request) {
    try {
        Device device = deviceRepository.findById(deviceId)
            .orElseThrow(() -> new DeviceNotFoundException(
                "Device not found with ID: " + deviceId));
        
        // Update device...
        
        return deviceMapper.toResponse(device);
        
    } catch (DeviceNotFoundException e) {
        log.warn("Attempt to update non-existent device: {}", deviceId);
        throw e;
    } catch (Exception e) {
        log.error("Failed to update device: {}", deviceId, e);
        throw new DeviceUpdateException("Failed to update device", e);
    }
}
```

## Communication Guidelines

### Slack Channels

Join relevant channels in [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA):

- **#dev-general**: General development discussions
- **#dev-frontend**: Frontend development topics
- **#dev-backend**: Backend development topics
- **#dev-security**: Security-related discussions
- **#dev-help**: Ask for help with development issues

### Communication Best Practices

- **Be specific**: Provide clear context when asking questions
- **Include details**: Share relevant code, error messages, and environment details
- **Be patient**: Maintainers are volunteers and may not respond immediately
- **Help others**: Answer questions when you can contribute

### Getting Help

1. **Check existing issues**: Search GitHub issues for similar problems
2. **Read documentation**: Review relevant guides and documentation
3. **Ask in Slack**: Use appropriate channels for questions
4. **Create detailed issues**: If you need to create an issue, include all relevant details

## Recognition

We appreciate all contributions to OpenFrame! Contributors will be recognized in:

- **GitHub Contributors**: Automatic recognition on the repository
- **Release Notes**: Significant contributions mentioned in releases
- **Community Highlights**: Outstanding contributions featured in community updates

---

**Thank you for contributing to OpenFrame!** 🎉 Your contributions help make MSP operations more efficient and automated for organizations worldwide.