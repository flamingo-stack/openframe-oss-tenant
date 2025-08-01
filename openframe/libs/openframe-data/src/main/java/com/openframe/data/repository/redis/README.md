# Machine ID Cache Implementation

## Overview

This package contains the Spring Data Redis implementation for machine ID caching functionality in OpenFrame.

## Components

### MachineIdCacheEntry
- **Location**: `com.openframe.data.model.redis.MachineIdCacheEntry`
- **Purpose**: Model class for machine ID cache entries with metadata
- **Features**:
  - TTL support with `@TimeToLive` annotation
  - Access tracking (count and last accessed time)
  - JSON serialization support

### MachineIdCacheRepository
- **Location**: `com.openframe.data.repository.redis.MachineIdCacheRepository`
- **Purpose**: Spring Data Redis repository interface for machine ID cache
- **Features**:
  - CRUD operations for machine ID cache entries
  - Agent ID based queries
  - Statistics and monitoring methods

### HostAgentCacheRepository
- **Location**: `com.openframe.data.repository.redis.HostAgentCacheRepository`
- **Purpose**: Redis repository for caching agent_id by host_id in Fleet activities stream processing
- **Features**:
  - Cache agent_id lookup by host_id
  - TTL management (24 hours)
  - Error handling and logging
  - CRUD operations for host-agent mapping

### MachineIdCacheService
- **Location**: `com.openframe.data.service.MachineIdCacheService`
- **Purpose**: Service layer for machine ID cache operations
- **Features**:
  - High-level cache operations
  - Error handling and logging
  - TTL management
  - Cache statistics

## Usage

### Using MachineIdCacheService (Recommended)

```java
@Service
public class MyService {
    private final MachineIdCacheService machineIdCacheService;
    
    // Get machine ID from cache
    Optional<String> machineId = machineIdCacheService.getMachineId("agent-123");
    
    // Store machine ID in cache with default TTL (6 hours)
    boolean success = machineIdCacheService.putMachineId("agent-123", "machine-456");
    
    // Store machine ID with custom TTL
    boolean success = machineIdCacheService.putMachineId("agent-123", "machine-456", Duration.ofHours(12));
    
    // Check if machine ID exists in cache
    boolean exists = machineIdCacheService.hasMachineId("agent-123");
    
    // Delete machine ID from cache
    boolean deleted = machineIdCacheService.deleteMachineId("agent-123");
    
    // Get cache statistics
    long size = machineIdCacheService.getCacheSize();
    
    // Get all cache entries
    List<MachineIdCacheEntry> entries = machineIdCacheService.getAllMachineIdEntries();
    
    // Clear all cache entries
    long deletedCount = machineIdCacheService.clearAllMachineIds();
}
```

### Direct Repository Usage

```java
@Service
public class MyService {
    private final MachineIdCacheRepository machineIdCacheRepository;
    
    // Get cache entry
    Optional<MachineIdCacheEntry> entry = machineIdCacheRepository.findByAgentId("agent-123");
    
    // Save cache entry
    MachineIdCacheEntry newEntry = MachineIdCacheEntry.of("agent-123", "machine-456", 21600);
    machineIdCacheRepository.save(newEntry);
    
    // Delete cache entry
    machineIdCacheRepository.deleteByAgentId("agent-123");
    
    // Check existence
    boolean exists = machineIdCacheRepository.existsByAgentId("agent-123");
    
    // Get all entries
    List<MachineIdCacheEntry> allEntries = machineIdCacheRepository.findAll();
    
    // Count entries
    long count = machineIdCacheRepository.count();
}
```

## Configuration

The Redis configuration is handled by `RedisConfig` in the config package:

- Enables Redis repositories with `@EnableRedisRepositories`
- Configures JSON serialization for values
- Uses String serialization for keys
- Conditional on `spring.data.redis.enabled` property

## Migration from Old Implementation

The old `RedisRepository` has been replaced with Spring Data Redis approach:

### Old Way
```java
RedisRepository redisRepository;
Optional<String> machineId = redisRepository.getMachineIdFromCache(agentId);
```

### New Way
```java
MachineIdCacheService machineIdCacheService;
Optional<String> machineId = machineIdCacheService.getMachineId(agentId);
```

## Benefits

1. **Type Safety**: Strong typing with Spring Data Redis
2. **Metadata**: Access tracking and creation timestamps
3. **Performance**: Optimized Redis operations
4. **Monitoring**: Built-in statistics and query capabilities
5. **TTL Management**: Automatic expiration handling
6. **Error Handling**: Comprehensive error handling and logging
7. **Service Layer**: Clean separation of concerns with dedicated service 