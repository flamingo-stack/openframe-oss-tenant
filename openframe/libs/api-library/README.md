# OpenFrame API Library

The OpenFrame API Library contains shared business logic and data transfer objects for device management operations that are used by both GraphQL and REST APIs.

## Purpose

This library was created to eliminate code duplication between the OpenFrame API service (GraphQL) and External API service (REST) by providing common:

- Device query and filtering logic
- Tag management operations with batch loading
- Device filter options and analytics
- Shared data transfer objects
- Unified service layer for both API types

## Architecture

The library follows a clean architecture pattern with clear separation of concerns:

```
api-library/
├── dto/          # Common data transfer objects
├── service/      # Shared business logic services
└── pom.xml       # Maven dependencies
```

### Package Structure

```
com.openframe.api/
├── dto/                    # Data Transfer Objects
│   ├── DeviceFilterOptions.java
│   ├── DeviceQueryResult.java
│   ├── PaginationCriteria.java
│   ├── DeviceFilters.java
│   ├── FilterOption.java
│   └── TagFilterOption.java
└── service/                # Business Logic Services
    ├── DeviceService.java
    ├── DeviceFilterService.java
    └── TagService.java
```

## Key Components

### Core Services

- **DeviceService**: Handles device querying, filtering, and pagination using MongoDB
- **DeviceFilterService**: Manages device filter options and analytics using Apache Pinot
- **TagService**: Handles tag operations for devices with efficient batch loading

### Data Transfer Objects

- **DeviceFilterOptions**: Common filter criteria for device queries
- **DeviceQueryResult**: Standardized response for device queries with pagination
- **PaginationCriteria**: Common pagination parameters
- **DeviceFilters**: Filter options with counts for UI components
- **FilterOption**: Simple filter option with value and count
- **TagFilterOption**: Tag filter option with value, label, and count

## Database Usage

The library uses multiple specialized databases:

- **MongoDB**: Primary storage for devices, tags, and relationships
- **Apache Pinot**: Analytics and filtering operations for performance
- **Redis**: Caching (through application layer)

## Usage Examples

### GraphQL API Service

GraphQL service uses the library services and DTOs:

```java
@DgsQuery
public DeviceConnection devices(
        @InputArgument DeviceFilterInput filter,
        @InputArgument PaginationInput pagination,
        @InputArgument String search) {

    // Convert GraphQL DTOs to common DTOs
    DeviceFilterOptions filterOptions = mapper.toDeviceFilterOptions(filter);
    PaginationCriteria paginationCriteria = mapper.toPaginationCriteria(pagination);

    // Use common service - same business logic as REST
    DeviceQueryResult result = deviceService.queryDevices(filterOptions, paginationCriteria, search);

    // Convert to GraphQL DTOs
    return mapper.toDeviceConnection(result);
}

@DgsQuery
public CompletableFuture<DeviceFilters> deviceFilters(@InputArgument DeviceFilterInput filter) {
    DeviceFilterOptions filterOptions = mapper.toDeviceFilterOptions(filter);
    
    // Return same DTO type - no conversion needed!
    return deviceFilterService.getDeviceFilters(filterOptions);
}
```

### REST API Service

REST service uses the same services:

```java
@GetMapping
public ResponseEntity<DevicesResponse> getDevices(
        @RequestParam(required = false) List<DeviceStatus> statuses,
        @RequestParam(defaultValue = "1") Integer page,
        @RequestParam(defaultValue = "20") Integer pageSize,
        @RequestParam(defaultValue = "false") Boolean includeTags) {

    // Build common DTOs
    DeviceFilterOptions filterOptions = DeviceFilterOptions.builder()
        .statuses(statuses)
        .build();
    
    PaginationCriteria pagination = PaginationCriteria.builder()
        .page(page)
        .pageSize(pageSize)
        .build();

    // Use same service as GraphQL
    DeviceQueryResult result = deviceService.queryDevices(filterOptions, pagination, search);

    // Handle tags efficiently
    if (includeTags) {
        List<String> machineIds = result.getDevices().stream()
            .map(Machine::getId)
            .collect(Collectors.toList());
        
        // Batch load tags for all devices
        List<List<Tag>> tagsPerMachine = tagService.getTagsForMachines(machineIds);
        return ResponseEntity.ok(deviceMapper.toDevicesResponseWithTags(result, tagsPerMachine));
    }
    
    return ResponseEntity.ok(deviceMapper.toDevicesResponse(result));
}
```

### Tag Loading Patterns

The TagService provides efficient batch loading to prevent N+1 query problems:

```java
@Service
public class TagService {
    
    // Batch loading for multiple devices
    public List<List<Tag>> getTagsForMachines(List<String> machineIds) {
        // Efficient batch loading with 2 database queries:
        // 1. Load all machine-tag relationships
        // 2. Load all tags
        // Group in memory
    }
    
    // Single device loading
    public List<Tag> getTagsForMachine(String machineId) {
        // Simple loading for single device
    }
}

// GraphQL DataLoader integration
@DgsDataLoader(name = "tagDataLoader")
@RequiredArgsConstructor
public class TagDataLoader implements BatchLoader<String, List<Tag>> {
    private final TagService tagService;
    
    @Override
    public CompletionStage<List<List<Tag>>> load(List<String> machineIds) {
        return CompletableFuture.supplyAsync(() -> tagService.getTagsForMachines(machineIds));
    }
}
```

## Benefits

1. **Zero Duplication**: Business logic written once, used by both APIs
2. **Consistent Behavior**: GraphQL and REST APIs behave identically
3. **Shared DTOs**: No conversion needed between API types for common objects
4. **Efficient Data Loading**: Batch loading prevents N+1 query problems
5. **Database Specialization**: Each database used for its strengths
6. **Maintainability**: Changes in one place affect both APIs
7. **Performance**: Optimized data loading and minimal object creation

## Architecture Decisions

### Database Strategy

- **MongoDB**: Primary storage for CRUD operations
- **Pinot**: Analytics and filtering for performance
- **Multi-database**: Services abstract database complexity

### DTO Strategy

- **Shared DTOs**: Same objects used by both APIs
- **No Conversion**: Eliminates mapping between identical classes
- **Type Safety**: Strong typing prevents runtime errors

## Development Guidelines

1. **Keep Services Database-Agnostic**: Services should abstract database complexity
2. **Use Batch Loading**: Always consider N+1 query problems
3. **Shared DTOs**: Create DTOs that work for both GraphQL and REST
4. **Test Business Logic**: Focus tests on service logic, not API specifics
5. **Performance First**: Consider performance implications of data loading patterns
6. **API Compatibility**: Ensure services work well with both GraphQL and REST patterns

## Dependencies

This library depends on:

- `openframe-core`: Core domain models (Machine, Tag, MachineTag, etc.)
- `openframe-data`: Repository access for MongoDB and Pinot
- Spring Framework: Dependency injection and data access
- Spring Data: MongoDB and reactive programming support

## Testing

Unit tests focus on business logic validation:

```java
@ExtendWith(MockitoExtension.class)
class DeviceServiceTest {
    @Mock
    private MachineRepository machineRepository;
    
    @Mock
    private TagRepository tagRepository;
    
    @InjectMocks
    private DeviceService deviceService;

    @Test
    void shouldQueryDevicesWithFilters() {
        // Arrange
        DeviceFilterOptions filter = DeviceFilterOptions.builder()
            .statuses(List.of(DeviceStatus.ONLINE))
            .build();
        
        PaginationCriteria pagination = PaginationCriteria.builder()
            .page(1)
            .pageSize(20)
            .build();

        // Act
        DeviceQueryResult result = deviceService.queryDevices(filter, pagination, null);

        // Assert
        assertThat(result.getDevices()).hasSize(expectedSize);
        verify(machineRepository).findMachinesWithPagination(any(), any());
    }
}
```

## Migration Notes

When migrating from separate API services:

1. **Service Consolidation**: Merged duplicate services into single implementations
2. **DTO Unification**: Removed duplicate DTOs and used shared objects
3. **Database Optimization**: Separated concerns between MongoDB and Pinot
4. **Performance Optimization**: Implemented batch loading patterns
5. **API Integration**: Ensured services work seamlessly with both GraphQL and REST

## Performance Characteristics

- **Tag Loading**: O(1) queries regardless of device count (batch loading)
- **Filter Operations**: Optimized using Pinot for analytics
- **Device Queries**: Efficient pagination and filtering
- **Memory Usage**: Minimal object creation through shared DTOs

This library enables OpenFrame to provide consistent, high-performance device management functionality across both GraphQL and REST APIs while maintaining clean separation of concerns and optimal database usage patterns. 