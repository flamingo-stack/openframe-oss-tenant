# Contributing to OpenFrame

Thank you for your interest in contributing to OpenFrame! This guide will help you get started with contributing to our Java Spring Boot backend and Vue.js frontend.

## Development Setup

1. Fork the repository
2. Clone your fork
3. Set up the development environment:
   - [Backend Setup](setup.md#backend-setup)
   - [Frontend Setup](setup.md#frontend-setup)

## Development Workflow

### 1. Create a Branch

```bash
# Create and switch to a new branch
git checkout -b feature/your-feature-name

# For bug fixes
git checkout -b fix/your-fix-name
```

### 2. Make Changes

#### Backend Changes
- Follow Java code style guidelines
- Write unit tests for new functionality
- Update API documentation
- Add appropriate logging

```java
// Example of good code style
@Service
@RequiredArgsConstructor
@Slf4j
public class DeviceService {
    private final DeviceRepository deviceRepository;
    
    public Device createDevice(CreateDeviceCommand command) {
        log.debug("Creating device: {}", command.getName());
        Device device = new Device(command.getName(), command.getType());
        return deviceRepository.save(device);
    }
}
```

#### Frontend Changes
- Follow Vue.js style guide
- Write component tests
- Update TypeScript types
- Add appropriate comments

```typescript
// Example of good component style
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useDeviceStore } from '@/stores/device'

const deviceStore = useDeviceStore()
const devices = ref<Device[]>([])

onMounted(async () => {
  devices.value = await deviceStore.fetchDevices()
})
</script>

<template>
  <div class="device-list">
    <DeviceCard
      v-for="device in devices"
      :key="device.id"
      :device="device"
      @update="handleUpdate"
    />
  </div>
</template>
```

### 3. Write Tests

#### Backend Tests
```java
@SpringBootTest
class DeviceServiceTest {
    @Autowired
    private DeviceService deviceService;
    
    @MockBean
    private DeviceRepository deviceRepository;
    
    @Test
    void shouldCreateDevice() {
        // Arrange
        CreateDeviceCommand command = new CreateDeviceCommand("Test Device", "workstation");
        Device expectedDevice = new Device("1", command.getName(), command.getType());
        when(deviceRepository.save(any(Device.class))).thenReturn(expectedDevice);
        
        // Act
        Device result = deviceService.createDevice(command);
        
        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getName()).isEqualTo(command.getName());
        verify(deviceRepository).save(any(Device.class));
    }
}
```

#### Frontend Tests
```typescript
import { mount } from '@vue/test-utils'
import DeviceList from './DeviceList.vue'

describe('DeviceList', () => {
  it('should display devices', () => {
    const devices = [
      { id: '1', name: 'Device 1', status: 'active' },
      { id: '2', name: 'Device 2', status: 'inactive' }
    ]
    
    const wrapper = mount(DeviceList, {
      props: { devices }
    })
    
    expect(wrapper.findAll('.device-item')).toHaveLength(2)
    expect(wrapper.text()).toContain('Device 1')
  })
})
```

### 4. Commit Changes

Follow conventional commit format:
```bash
# Format
<type>(<scope>): <description>

# Examples
feat(device): add device creation endpoint
fix(auth): resolve token refresh issue
docs(api): update authentication documentation
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

### 5. Push Changes

```bash
git push origin feature/your-feature-name
```

### 6. Create Pull Request

1. Go to GitHub and create a new pull request
2. Fill in the PR template
3. Link related issues
4. Add screenshots for UI changes
5. Request reviews from maintainers

## Code Review Process

1. Automated Checks
   - Build passes
   - Tests pass
   - Code style compliance
   - Coverage requirements met

2. Code Review
   - Architecture review
   - Code quality review
   - Security review
   - Performance review

3. Merge Requirements
   - All checks pass
   - Required reviews completed
   - No merge conflicts
   - Documentation updated

## Testing Requirements

### Backend
- Unit test coverage > 80%
- Integration tests for new endpoints
- Performance tests for critical paths
- Security tests for new features

### Frontend
- Component test coverage > 80%
- E2E tests for critical user flows
- Accessibility testing
- Cross-browser testing

## Documentation

### Backend Documentation
- Update API documentation
- Add Javadoc comments
- Update README if needed
- Document configuration changes

### Frontend Documentation
- Update component documentation
- Add TypeScript type definitions
- Update README if needed
- Document new features

## Community Guidelines

1. Be respectful and professional
2. Follow the code of conduct
3. Help others learn
4. Share knowledge
5. Be patient with reviews

## Getting Help

- Check existing documentation
- Search closed issues
- Ask in discussions
- Join our community chat

## Recognition

Contributors are recognized through:
- GitHub profile badges
- Contributor hall of fame
- Release notes
- Community highlights

## Next Steps

- [Development Setup](setup.md)
- [Architecture](architecture.md)
- [Testing](testing.md)
- [Code Style](code-style.md) 