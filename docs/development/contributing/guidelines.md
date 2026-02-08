# Contributing Guidelines

Welcome to OpenFrame! We're excited to have you contribute to the future of MSP platforms. This guide covers everything you need to know about contributing code, documentation, and improvements to OpenFrame.

## How to Contribute

OpenFrame welcomes contributions in many forms:

- 🐛 **Bug Reports**: Help us identify and fix issues
- 💡 **Feature Requests**: Suggest new functionality
- 🔧 **Code Contributions**: Submit pull requests with improvements
- 📖 **Documentation**: Improve guides, tutorials, and API documentation
- 🧪 **Testing**: Add test coverage or improve testing practices
- 🎨 **Design**: UI/UX improvements and design suggestions

## Before You Start

### Join the Community

All OpenFrame development coordination happens in the **OpenMSP Slack community**:

- 💬 **Join Slack**: [https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
- 🗣️ **Discuss Ideas**: #general and #feature-requests channels
- 👩‍💻 **Development Chat**: #development channel
- 🐛 **Report Bugs**: #bug-reports channel

> **Important**: We don't use GitHub Issues or GitHub Discussions. All coordination happens in the OpenMSP Slack community.

### Check Existing Work

Before starting any contribution:

1. **Search Slack channels** for existing discussions about your idea
2. **Check current pull requests** to avoid duplicate work
3. **Review the project roadmap** discussed in Slack channels
4. **Ask questions** in the appropriate Slack channel

## Development Setup

Ensure you have completed the development environment setup:

1. **[Environment Setup](../setup/environment.md)** - IDE and tools configuration
2. **[Local Development](../setup/local-development.md)** - Running OpenFrame locally
3. **[Architecture Overview](../architecture/overview.md)** - Understanding the codebase

### Fork and Clone

```bash
# Fork the repository on GitHub
# Then clone your fork
git clone https://github.com/YOUR_USERNAME/openframe-oss-tenant
cd openframe-oss-tenant

# Add upstream remote
git remote add upstream https://github.com/flamingo-stack/openframe-oss-tenant
git remote -v
```

### Development Branches

```bash
# Create a feature branch from main
git checkout main
git pull upstream main
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/issue-description

# Or for documentation
git checkout -b docs/documentation-improvement
```

## Code Style and Standards

### Java Code Style

OpenFrame follows Google Java Style Guide with some modifications:

**Formatting Rules**:
- **Indentation**: 4 spaces (not tabs)
- **Line length**: 120 characters maximum
- **Imports**: Use wildcard imports for 5+ classes from same package
- **Braces**: Always use braces, even for single-line blocks

**Example Java Code**:
```java
/**
 * Service for managing device operations with multi-tenant support.
 */
@Service
@Slf4j
public class DeviceService {
    
    private final DeviceRepository deviceRepository;
    private final EventPublisher eventPublisher;
    private final TenantContextProvider tenantContextProvider;
    
    public DeviceService(
            DeviceRepository deviceRepository,
            EventPublisher eventPublisher,
            TenantContextProvider tenantContextProvider) {
        this.deviceRepository = requireNonNull(deviceRepository, "deviceRepository cannot be null");
        this.eventPublisher = requireNonNull(eventPublisher, "eventPublisher cannot be null");
        this.tenantContextProvider = requireNonNull(tenantContextProvider, "tenantContextProvider cannot be null");
    }
    
    /**
     * Creates a new device for the current tenant.
     *
     * @param request the device creation request
     * @return the created device
     * @throws TenantContextMissingException if no tenant context is available
     */
    public Device createDevice(CreateDeviceRequest request) {
        requireNonNull(request, "request cannot be null");
        
        String tenantId = tenantContextProvider.getCurrentTenantId()
            .orElseThrow(() -> new TenantContextMissingException("Tenant context is required"));
        
        Device device = Device.builder()
            .tenantId(tenantId)
            .name(request.getName())
            .organizationId(request.getOrganizationId())
            .status(DeviceStatus.OFFLINE)
            .createdAt(Instant.now())
            .build();
        
        Device savedDevice = deviceRepository.save(device);
        
        eventPublisher.publishEvent(DeviceCreatedEvent.builder()
            .deviceId(savedDevice.getId())
            .tenantId(tenantId)
            .timestamp(Instant.now())
            .build());
        
        log.info("Created device {} for tenant {}", savedDevice.getId(), tenantId);
        return savedDevice;
    }
}
```

### TypeScript/React Code Style

OpenFrame follows Airbnb TypeScript Style Guide:

**Formatting Rules**:
- **Indentation**: 2 spaces
- **Line length**: 100 characters maximum
- **Quotes**: Single quotes for strings, double quotes for JSX attributes
- **Semicolons**: Always required
- **Trailing commas**: Required for multiline arrays/objects

**Example React Component**:
```typescript
import React, { useState, useCallback } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Device, DeviceStatus } from '@/types/device';
import { GET_DEVICES, UPDATE_DEVICE_STATUS } from './queries';

interface DeviceListProps {
  organizationId: string;
  onDeviceSelect?: (device: Device) => void;
}

/**
 * Component for displaying and managing a list of devices.
 * Supports real-time updates and bulk operations.
 */
export function DeviceList({ organizationId, onDeviceSelect }: DeviceListProps) {
  const { toast } = useToast();
  const [selectedDevices, setSelectedDevices] = useState<Set<string>>(new Set());
  
  const { data, loading, error, refetch } = useQuery(GET_DEVICES, {
    variables: { organizationId },
    pollInterval: 30000, // Poll every 30 seconds
  });
  
  const [updateDeviceStatus] = useMutation(UPDATE_DEVICE_STATUS, {
    onCompleted: () => {
      toast({
        title: 'Success',
        description: 'Device status updated successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update device status: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
  
  const handleStatusUpdate = useCallback(
    async (deviceId: string, status: DeviceStatus) => {
      try {
        await updateDeviceStatus({
          variables: { deviceId, status },
        });
      } catch (error) {
        console.error('Failed to update device status:', error);
      }
    },
    [updateDeviceStatus],
  );
  
  const handleDeviceSelect = useCallback(
    (device: Device) => {
      onDeviceSelect?.(device);
    },
    [onDeviceSelect],
  );
  
  if (loading) {
    return <div className="text-center">Loading devices...</div>;
  }
  
  if (error) {
    return (
      <div className="text-center text-red-600">
        Error loading devices: {error.message}
      </div>
    );
  }
  
  const devices = data?.devices?.edges?.map((edge) => edge.node) ?? [];
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Devices</h2>
        <Button onClick={() => refetch()}>Refresh</Button>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {devices.map((device) => (
          <Card
            key={device.id}
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => handleDeviceSelect(device)}
          >
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>{device.name}</span>
                <StatusBadge status={device.status} />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-gray-600">
                <div>Last seen: {formatDistanceToNow(new Date(device.lastSeen))}</div>
                <div>OS: {device.operatingSystem}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

### Rust Code Style

Follow the official Rust Style Guide:

**Formatting Rules**:
- Use `cargo fmt` for automatic formatting
- Run `cargo clippy` for linting
- Follow Rust naming conventions (snake_case for functions, PascalCase for types)

**Example Rust Code**:
```rust
use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::time::{Duration, Instant};
use tokio::time::sleep;
use tracing::{error, info, warn};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentConfig {
    pub server_url: String,
    pub tenant_id: String,
    pub heartbeat_interval: Duration,
    pub max_retries: u32,
}

impl Default for AgentConfig {
    fn default() -> Self {
        Self {
            server_url: "http://localhost:8080".to_string(),
            tenant_id: String::new(),
            heartbeat_interval: Duration::from_secs(30),
            max_retries: 3,
        }
    }
}

/// Agent responsible for device monitoring and communication with OpenFrame.
pub struct OpenFrameAgent {
    config: AgentConfig,
    client: reqwest::Client,
    device_id: Option<String>,
}

impl OpenFrameAgent {
    /// Creates a new agent with the given configuration.
    pub fn new(config: AgentConfig) -> Self {
        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(30))
            .user_agent("OpenFrame-Agent/1.0")
            .build()
            .expect("Failed to create HTTP client");
        
        Self {
            config,
            client,
            device_id: None,
        }
    }
    
    /// Registers the agent with the OpenFrame server.
    pub async fn register(&mut self, registration_secret: &str) -> Result<()> {
        info!("Registering agent with server: {}", self.config.server_url);
        
        let registration_request = RegistrationRequest {
            tenant_id: self.config.tenant_id.clone(),
            secret: registration_secret.to_string(),
            device_info: self.collect_device_info()?,
        };
        
        let response = self
            .client
            .post(&format!("{}/api/v1/agents/register", self.config.server_url))
            .json(&registration_request)
            .send()
            .await
            .context("Failed to send registration request")?;
        
        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            anyhow::bail!("Registration failed: {}", error_text);
        }
        
        let registration_response: RegistrationResponse = response
            .json()
            .await
            .context("Failed to parse registration response")?;
        
        self.device_id = Some(registration_response.device_id);
        info!("Successfully registered with device ID: {}", registration_response.device_id);
        
        Ok(())
    }
    
    /// Starts the agent heartbeat loop.
    pub async fn start_heartbeat(&self) -> Result<()> {
        let device_id = self.device_id.as_ref()
            .ok_or_else(|| anyhow::anyhow!("Agent must be registered before starting heartbeat"))?;
        
        info!("Starting heartbeat loop with interval: {:?}", self.config.heartbeat_interval);
        
        loop {
            if let Err(error) = self.send_heartbeat(device_id).await {
                warn!("Heartbeat failed: {}", error);
            }
            
            sleep(self.config.heartbeat_interval).await;
        }
    }
    
    async fn send_heartbeat(&self, device_id: &str) -> Result<()> {
        let heartbeat = Heartbeat {
            device_id: device_id.to_string(),
            timestamp: chrono::Utc::now(),
            status: "online".to_string(),
        };
        
        let response = self
            .client
            .post(&format!("{}/api/v1/agents/{}/heartbeat", self.config.server_url, device_id))
            .json(&heartbeat)
            .send()
            .await?;
        
        if response.status().is_success() {
            info!("Heartbeat sent successfully");
        } else {
            warn!("Heartbeat failed with status: {}", response.status());
        }
        
        Ok(())
    }
    
    fn collect_device_info(&self) -> Result<DeviceInfo> {
        // Implementation for collecting device information
        Ok(DeviceInfo {
            hostname: hostname::get()?.to_string_lossy().to_string(),
            operating_system: std::env::consts::OS.to_string(),
            architecture: std::env::consts::ARCH.to_string(),
        })
    }
}
```

## Commit Message Format

Use **Conventional Commits** format for clear, semantic commit messages:

```text
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Commit Types

| Type | Description | Example |
|------|-------------|---------|
| `feat` | New feature | `feat(api): add device status filtering` |
| `fix` | Bug fix | `fix(frontend): resolve device list pagination` |
| `docs` | Documentation | `docs(contributing): add commit message guidelines` |
| `style` | Formatting changes | `style(java): fix checkstyle violations` |
| `refactor` | Code refactoring | `refactor(service): extract tenant validation logic` |
| `test` | Testing changes | `test(device): add integration tests for device creation` |
| `chore` | Maintenance tasks | `chore(deps): update Spring Boot to 3.3.1` |

### Examples

**Good commit messages**:
```bash
feat(device): implement real-time device status updates

Add WebSocket support for device status changes and implement
real-time updates in the frontend device list component.

Closes #123

fix(auth): resolve JWT token refresh race condition

Prevent multiple concurrent token refresh requests by adding
proper synchronization to the token refresh logic.

docs(api): add GraphQL schema documentation

Add comprehensive documentation for all GraphQL queries,
mutations, and subscriptions with examples.

test(integration): add tenant isolation tests

Ensure all database queries properly filter by tenant ID
and verify data isolation between tenants.
```

**Bad commit messages**:
```bash
# Too vague
fix stuff

# No type or scope
added new feature

# Not descriptive
update

# Too long for title
feat(device): implement a new comprehensive device management system with real-time updates, status monitoring, and advanced filtering capabilities for multi-tenant environments
```

## Pull Request Process

### 1. Prepare Your Changes

```bash
# Ensure your branch is up to date
git checkout main
git pull upstream main
git checkout your-feature-branch
git rebase main

# Run tests and linting
mvn test                          # Java tests
npm test                          # Frontend tests  
cargo test                        # Rust tests
cargo fmt && cargo clippy         # Rust formatting and linting
```

### 2. Create Pull Request

**Pull Request Template**:
```markdown
## Description

Brief description of the changes and why they're needed.

## Type of Change

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Code refactoring

## How Has This Been Tested?

- [ ] Unit tests
- [ ] Integration tests
- [ ] Manual testing
- [ ] E2E tests

Describe the tests you ran and provide instructions to reproduce.

## Checklist

- [ ] My code follows the style guidelines of this project
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
- [ ] Any dependent changes have been merged and published

## Screenshots (if applicable)

Add screenshots to help explain your changes.

## Additional Notes

Any additional information, concerns, or questions.
```

### 3. Pull Request Guidelines

**Title Format**:
```text
<type>(<scope>): <description>

Examples:
feat(api): add device filtering by organization
fix(frontend): resolve memory leak in device list
docs(readme): update installation instructions
```

**Review Process**:
1. **Automated Checks**: Ensure all CI checks pass
2. **Code Review**: At least one maintainer review required
3. **Testing**: Verify tests pass and coverage meets requirements
4. **Documentation**: Update docs if needed
5. **Merge**: Squash and merge after approval

## Testing Requirements

All contributions must include appropriate tests:

### Java Testing

```java
// Unit tests required for all service methods
@Test
@DisplayName("Should create device with proper tenant isolation")
void shouldCreateDeviceWithProperTenantIsolation() {
    // Given
    String tenantId = "test-tenant-123";
    TenantContext.setTenantId(tenantId);
    
    CreateDeviceRequest request = CreateDeviceRequest.builder()
        .name("Test Device")
        .organizationId("org-123")
        .build();
    
    // When
    Device result = deviceService.createDevice(request);
    
    // Then
    assertThat(result.getTenantId()).isEqualTo(tenantId);
    verify(deviceRepository).save(argThat(device -> 
        device.getTenantId().equals(tenantId)));
}
```

### Frontend Testing

```typescript
// Component tests required for all UI components
describe('DeviceStatusBadge', () => {
  it('displays correct status and styling', () => {
    render(<DeviceStatusBadge status="ONLINE" />);
    
    const badge = screen.getByText('ONLINE');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-green-100', 'text-green-800');
  });
  
  it('handles status updates', async () => {
    const mockOnStatusChange = jest.fn();
    render(
      <DeviceStatusBadge 
        status="OFFLINE" 
        editable 
        onStatusChange={mockOnStatusChange} 
      />
    );
    
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByText('Online'));
    
    expect(mockOnStatusChange).toHaveBeenCalledWith('ONLINE');
  });
});
```

### Rust Testing

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use tokio_test;
    
    #[tokio::test]
    async fn test_agent_registration() {
        // Given
        let config = AgentConfig::default();
        let mut agent = OpenFrameAgent::new(config);
        
        // When
        let result = agent.register("test-secret").await;
        
        // Then
        assert!(result.is_ok());
        assert!(agent.device_id.is_some());
    }
}
```

## Documentation Standards

### Code Documentation

**Java Documentation**:
```java
/**
 * Service for managing device operations with multi-tenant support.
 * 
 * <p>This service handles device creation, updates, and status management
 * while ensuring proper tenant isolation. All operations are performed
 * within the context of the current tenant.
 *
 * @since 1.0
 * @author OpenFrame Team
 */
@Service
public class DeviceService {
    
    /**
     * Creates a new device for the current tenant.
     *
     * @param request the device creation request containing name and organization
     * @return the newly created device with assigned ID and tenant context
     * @throws TenantContextMissingException if no tenant context is available
     * @throws IllegalArgumentException if the request is null or invalid
     * @since 1.0
     */
    public Device createDevice(CreateDeviceRequest request) {
        // Implementation
    }
}
```

**TypeScript Documentation**:
```typescript
/**
 * Hook for managing device operations including status updates and commands.
 * 
 * Provides methods for device management with optimistic updates and error handling.
 * Automatically handles tenant context and authorization.
 *
 * @param organizationId - The organization ID to scope device operations
 * @returns Object containing device operation methods and loading states
 * 
 * @example
 * ```typescript
 * const { updateStatus, executeCommand, loading } = useDeviceActions('org-123');
 * 
 * await updateStatus('device-456', 'MAINTENANCE');
 * await executeCommand('device-456', { type: 'restart', params: {} });
 * ```
 */
export function useDeviceActions(organizationId: string) {
    // Implementation
}
```

### API Documentation

Update GraphQL schema documentation:

```graphql
"""
Device represents a managed endpoint in the OpenFrame system.
Devices belong to organizations and have associated agents for monitoring.
"""
type Device {
  """Unique identifier for the device"""
  id: ID!
  
  """Human-readable name for the device"""
  name: String!
  
  """Current operational status of the device"""
  status: DeviceStatus!
  
  """Organization that owns this device"""
  organization: Organization!
  
  """Timestamp when device was last seen online"""
  lastSeen: DateTime
  
  """Operating system information"""
  operatingSystem: String
  
  """Device hardware specifications"""
  hardware: DeviceHardware
}
```

## Security Considerations

### Security Checklist

- [ ] **Input Validation**: All user inputs are properly validated
- [ ] **Tenant Isolation**: Multi-tenant data separation is enforced
- [ ] **Authentication**: Proper JWT token validation
- [ ] **Authorization**: Role-based access control implemented  
- [ ] **SQL Injection**: Parameterized queries used
- [ ] **XSS Prevention**: User content properly escaped
- [ ] **CSRF Protection**: CSRF tokens implemented where needed
- [ ] **Secrets Management**: No hardcoded credentials or secrets

### Secure Coding Examples

**Input Validation**:
```java
@PostMapping("/api/v1/devices")
public ResponseEntity<Device> createDevice(@Valid @RequestBody CreateDeviceRequest request) {
    // @Valid annotation triggers validation
    Device device = deviceService.createDevice(request);
    return ResponseEntity.status(HttpStatus.CREATED).body(device);
}

// Request DTO with validation
public class CreateDeviceRequest {
    @NotBlank(message = "Device name is required")
    @Size(min = 1, max = 100, message = "Device name must be between 1 and 100 characters")
    private String name;
    
    @NotNull(message = "Organization ID is required")
    @Pattern(regexp = "^[a-zA-Z0-9\\-_]+$", message = "Invalid organization ID format")
    private String organizationId;
}
```

**Tenant Isolation**:
```java
@Repository
public class DeviceRepository {
    
    public List<Device> findByOrganizationId(String organizationId) {
        String tenantId = TenantContext.getCurrentTenantId()
            .orElseThrow(() -> new SecurityException("Tenant context required"));
            
        // Always include tenant filter
        return mongoTemplate.find(
            Query.query(Criteria.where("tenantId").is(tenantId)
                .and("organizationId").is(organizationId)),
            Device.class
        );
    }
}
```

## Performance Guidelines

### Database Performance

```java
// Use proper indexing
@Indexed({"tenantId", "organizationId", "status"})
@Document(collection = "devices")
public class Device {
    // Implementation
}

// Use pagination for large datasets
public Page<Device> findDevices(String tenantId, Pageable pageable) {
    return deviceRepository.findByTenantId(tenantId, pageable);
}

// Use projections for list views
public interface DeviceListProjection {
    String getId();
    String getName();
    DeviceStatus getStatus();
    Instant getLastSeen();
}
```

### Frontend Performance

```typescript
// Use React.memo for expensive components
const DeviceCard = React.memo(({ device, onStatusChange }: DeviceCardProps) => {
  return (
    <Card>
      <CardContent>{/* ... */}</CardContent>
    </Card>
  );
});

// Use useMemo for expensive calculations
const filteredDevices = useMemo(() => {
  return devices.filter(device => 
    device.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
}, [devices, searchTerm]);

// Use useCallback for stable function references
const handleStatusChange = useCallback((deviceId: string, status: DeviceStatus) => {
  updateDeviceStatus({ variables: { deviceId, status } });
}, [updateDeviceStatus]);
```

## Common Mistakes to Avoid

### 1. Breaking Multi-Tenant Isolation

**❌ Bad**: Queries without tenant context
```java
public List<Device> getAllDevices() {
    return deviceRepository.findAll(); // Exposes all tenants' data
}
```

**✅ Good**: Always include tenant context
```java
public List<Device> getAllDevices() {
    String tenantId = TenantContext.getCurrentTenantId()
        .orElseThrow(() -> new SecurityException("Tenant context required"));
    return deviceRepository.findByTenantId(tenantId);
}
```

### 2. Inadequate Error Handling

**❌ Bad**: Exposing internal errors
```java
@PostMapping("/devices")
public ResponseEntity<Device> createDevice(@RequestBody CreateDeviceRequest request) {
    Device device = deviceService.createDevice(request); // Can throw unexpected exceptions
    return ResponseEntity.ok(device);
}
```

**✅ Good**: Proper error handling
```java
@PostMapping("/devices")
public ResponseEntity<?> createDevice(@RequestBody CreateDeviceRequest request) {
    try {
        Device device = deviceService.createDevice(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(device);
    } catch (ValidationException e) {
        return ResponseEntity.badRequest().body(new ErrorResponse(e.getMessage()));
    } catch (TenantContextMissingException e) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(new ErrorResponse("Access denied"));
    } catch (Exception e) {
        log.error("Unexpected error creating device", e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(new ErrorResponse("An unexpected error occurred"));
    }
}
```

### 3. Missing Test Coverage

**❌ Bad**: No tests for critical paths
```java
// No tests for this critical security method
public boolean hasDeviceAccess(String deviceId, String userId) {
    // Critical security logic without tests
}
```

**✅ Good**: Comprehensive test coverage
```java
@Test
void shouldDenyAccessToDeviceFromDifferentTenant() {
    // Test tenant isolation
}

@Test  
void shouldAllowAccessToDeviceInSameTenant() {
    // Test valid access
}

@Test
void shouldDenyAccessWithInvalidUser() {
    // Test unauthorized access
}
```

## Getting Help

### Where to Ask Questions

- 💬 **#development**: General development questions
- 🐛 **#bug-reports**: Bug reports and issues
- 💡 **#feature-requests**: New feature discussions
- 📖 **#documentation**: Documentation questions
- 🧪 **#testing**: Testing best practices

### Code Review Process

1. **Self Review**: Review your own code before submitting
2. **Automated Checks**: Ensure all CI checks pass
3. **Peer Review**: Get feedback from other contributors
4. **Maintainer Review**: Final review by project maintainers
5. **Merge**: Changes integrated after approval

### Mentorship

New contributors can get help from experienced community members:

- Ask questions in Slack channels
- Request code review and feedback
- Pair programming sessions (arranged via Slack)
- Architecture discussions for larger changes

## Recognition

We value all contributions to OpenFrame:

- 🏆 **Contributors List**: Recognition in project documentation
- 🎯 **Feature Attribution**: Credit for significant features
- 📢 **Community Highlights**: Showcase in community updates
- 🚀 **Growth Opportunities**: Path to maintainer role for consistent contributors

## Next Steps

Ready to contribute? Here's your path:

1. **Join OpenMSP Slack** and introduce yourself
2. **Set up your development environment**
3. **Pick an issue** or feature to work on (discuss in Slack first)
4. **Write your code** following these guidelines
5. **Submit a pull request** and engage with reviewers
6. **Celebrate** your contribution to the OpenFrame community!

## Questions?

For any questions about contributing:

- 💬 **Ask in Slack**: [#development channel](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
- 📖 **Review docs**: Check development documentation
- 🤝 **Connect with maintainers**: Reach out to project maintainers in Slack

Welcome to the OpenFrame community – we're excited to see what you'll build! 🚀