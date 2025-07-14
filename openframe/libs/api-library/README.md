# OpenFrame API Library

The OpenFrame API Library contains shared business logic for device management operations that are used by both GraphQL
and REST APIs.

## Purpose

This library was created to eliminate code duplication between the OpenFrame API service (GraphQL) and External API
service (REST) by providing common:

- Device query and filtering logic
- Pagination utilities
- Tag management operations
- Data transfer objects for common operations
- Service layer abstractions

## Architecture

The library follows a clean architecture pattern with clear separation of concerns:

```
api-library/
├── dto/          # Common data transfer objects
├── service/      # Shared business logic services
├── util/         # Utility classes
└── mapper/       # Data mapping utilities (if needed)
```

## Key Components

### Common Services

- **CommonDeviceService**: Handles device querying, filtering, and pagination
- **CommonDeviceFilterService**: Manages device filter options and counts
- **CommonTagService**: Handles tag operations for devices

### DTOs

- **DeviceFilterOptions**: Common filter criteria for device queries
- **DeviceQueryResult**: Standardized response for device queries with pagination
- **PaginationCriteria**: Common pagination parameters

## Usage

### In GraphQL API Service

The GraphQL service uses this library to perform the actual business logic, then maps the results to GraphQL-specific
DTOs:

```java

@DgsQuery
public DeviceConnection devices(
        @InputArgument DeviceFilterInput filter,
        @InputArgument PaginationInput pagination,
        @InputArgument String search) {

    // Convert GraphQL DTOs to common DTOs
    DeviceFilterOptions commonFilter = mapper.toCommonFilter(filter);
    PaginationCriteria commonPagination = mapper.toCommonPagination(pagination);

    // Use common service
    DeviceQueryResult result = commonDeviceService.getDevices(commonFilter, commonPagination, search);

    // Convert back to GraphQL DTOs
    return mapper.toGraphQLConnection(result);
}
```

### In REST API Service

The REST service also uses the same common services but maps to REST-specific DTOs:

```java

@GetMapping
public ResponseEntity<DevicesResponse> getDevices(
        @RequestParam List<DeviceStatus> statuses,
        @RequestParam Integer page,
        @RequestParam Integer pageSize) {

    // Convert REST params to common DTOs
    DeviceFilterOptions filter = DeviceFilterOptions.builder()
            .statuses(statuses)
            .build();
    PaginationCriteria pagination = PaginationCriteria.builder()
            .page(page)
            .pageSize(pageSize)
            .build();

    // Use common service
    DeviceQueryResult result = commonDeviceService.getDevices(filter, pagination, null);

    // Convert to REST DTOs
    DevicesResponse response = deviceMapper.toDevicesResponse(result);
    return ResponseEntity.ok(response);
}
```

## Benefits

1. **DRY Principle**: Business logic is written once and reused
2. **Consistency**: Both APIs use the same underlying logic ensuring consistent behavior
3. **Maintainability**: Changes to business logic only need to be made in one place
4. **Testability**: Business logic can be tested independently of API layers
5. **Separation of Concerns**: API-specific concerns (GraphQL vs REST) are separated from business logic

## Development Guidelines

1. **Keep it API-agnostic**: Don't include GraphQL or REST-specific code in this library
2. **Use common DTOs**: Create DTOs that can be easily mapped to both GraphQL and REST formats
3. **Focus on business logic**: Only include business logic, not presentation concerns
4. **Maintain backwards compatibility**: Changes should not break existing API services
5. **Test thoroughly**: All shared business logic should have comprehensive tests

## Dependencies

This library depends on:

- `openframe-core`: For core domain models (Machine, Tag, etc.)
- `openframe-data`: For repository access
- Spring Framework: For dependency injection and data access

## Testing

Unit tests focus on business logic validation:

```java

@ExtendWith(MockitoExtension.class)
class CommonDeviceServiceTest {
    @Mock
    private MachineRepository machineRepository;

    @InjectMocks
    private CommonDeviceService commonDeviceService;

    @Test
    void shouldReturnPaginatedDevices() {
        // Test implementation
    }
}
```

## Migration Notes

When migrating from the original API service:

1. **Service logic**: Move business logic from API-specific services to common services
2. **DTOs**: Create common DTOs and mappers for API-specific DTOs
3. **Tests**: Migrate tests to focus on business logic rather than API specifics
4. **Dependencies**: Update API services to depend on this library

This library enables OpenFrame to provide consistent device management functionality across both GraphQL and REST APIs
while maintaining clean separation of concerns. 