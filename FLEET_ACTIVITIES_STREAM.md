# Fleet Activities Stream - Kafka Streams Data Enrichment Pipeline

## Overview

This document describes the implementation of a Kafka Streams-based data enrichment pipeline in the `openframe-stream` microservice. The pipeline processes Debezium CDC events from two Kafka topics (`activities` and `host_activities`), joins them on timestamp key, enriches activity data with `agentId` obtained via Redis cache or fallback Fleet MySQL DB lookup, and outputs enriched events to a result topic.

## Architecture

### Data Flow

```
fleet.activities.events (Kafka) 
    ↓
ActivityMessage (DebeziumMessage<Activity>)
    ↓
Kafka Streams Join (leftJoin)
    ↓
HostActivityMessage (DebeziumMessage<HostActivity>)
    ↓
Enrichment with agentId
    ↓
Redis Cache (HostAgentCacheService) → Fleet MySQL DB (fallback)
    ↓
fleet.mysql.events (Kafka) - Enriched ActivityMessage
```

### Components

1. **Input Topics:**
   - `fleet.activities.events` - Debezium CDC events from activities table
   - `fleet.host_activities.events` - Debezium CDC events from host_activities table

2. **Output Topic:**
   - `fleet.mysql.events` - Enriched activity events with agentId

3. **Data Sources:**
   - Redis Cache - Fast lookup for host_id → agent_id mapping
   - Fleet MySQL Database - Fallback source for host information

## Data Models

### Activity Model
```java
@Data
public class Activity {
    private Long id;
    private String createdAt;
    private Long userId;
    private String userName;
    private String activityType;
    private String details;
    private Integer streamed;
    private String userEmail;
    
    // Enrichment fields (not from Debezium)
    private String agentId;
    private Long hostId;
}
```

### HostActivity Model
```java
@Data
public class HostActivity {
    private Long hostId;
    private Long activityId; // Changed from String to Long for join with Activity.id
}
```

### FleetHost Model
```java
@Entity
@Table(name = "hosts")
@Data
public class FleetHost {
    @Id
    private Long id;
    
    @Column(name = "uuid")
    private String uuid; // This is the agent_id
    
    // Other fields...
}
```

## Implementation Status

### ✅ Completed Components:

1. **Модели данных** - `Activity`, `HostActivity`, `FleetHost` в пакете `fleet`
2. **Типизированные сообщения** - `ActivityMessage` и `HostActivityMessage` наследуют от `DebeziumMessage<T>`
3. **SerdeConfig** - правильно настроен для типизированных сообщений
4. **FleetDatabaseConfig** - правильно настроен для Fleet DB
5. **FleetHostRepository** - упрощен, использует только `findById` и `findAgentIdByHostId`
6. **HostAgentCacheService** - создан по аналогии с MachineIdCacheService, заменяет HostAgentCacheRepository
7. **TopicConfig** - заменен на `@Value` в `ActivityEnrichmentService`
8. **StreamLifecycleService** - управление жизненным циклом Kafka Streams
9. **StreamMonitoringController** - REST endpoints для мониторинга
10. **Исправлены ошибки компиляции** - правильные импорты и типы данных

### ❌ Критические проблемы для исправления:

1. **Фильтрация Debezium событий** - нужно оставлять только INSERT/UPDATE, брать только `after`
2. **Обработка ошибок** - улучшить error handling в join логике
3. **Мониторинг и метрики** - добавить метрики для производительности
4. **Тесты** - добавить интеграционные тесты

## Implementation Plan

### Архитектура решения

1. **Источники данных:**
   - Топик `fleet.activities.events` - события из таблицы activities (Debezium)
   - Топик `fleet.host_activities.events` - события из таблицы host_activities (Debezium)
   - Redis - кэш для agent_id по host_id (HostAgentCacheService)
   - Fleet Database - источник данных для hosts таблицы

2. **Обработка:**
   - Kafka Streams join по activity_id
   - Обогащение данных agentId из кэша или БД
   - Фильтрация Debezium событий (только INSERT/UPDATE)

3. **Результат:**
   - Обогащенные события в топике `fleet.mysql.events`

### Логика обогащения

```java
// 1. Join Activity с HostActivity по activity_id
KStream<String, ActivityMessage> enrichedStream = activityStream
    .leftJoin(
        hostActivityStreamByActivityId,
        this::enrichActivityWithHostInfo,
        JoinWindows.ofTimeDifferenceWithNoGrace(Duration.ofSeconds(10)),
        StreamJoined.with(Serdes.String(), activityMessageSerde, hostActivityMessageSerde)
    );

// 2. Обогащение agentId
private String getAgentIdFromCacheOrDatabase(Long hostId) {
    // Try Redis cache first using HostAgentCacheService
    return hostAgentCacheService.getAgentId(hostId)
        .orElseGet(() -> {
            // Fallback to Fleet database
            return fleetHostRepository.findAgentIdByHostId(hostId)
                .map(agentId -> {
                    // Cache the result for future use
                    hostAgentCacheService.putAgentId(hostId, agentId);
                    return agentId;
                })
                .orElse(null);
        });
}
```

## Configuration

### Application Properties

```yaml
# Kafka Topics
kafka:
  topics:
    activities: fleet.activities.events
    host-activities: fleet.host_activities.events
    enriched-activities: fleet.mysql.events

# Fleet Database
spring:
  datasource:
    fleet:
      url: jdbc:mysql://fleet-db:3306/fleet
      username: ${FLEET_DB_USERNAME}
      password: ${FLEET_DB_PASSWORD}
      driver-class-name: com.mysql.cj.jdbc.Driver

# Redis Cache
spring:
  data:
    redis:
      host: ${REDIS_HOST:localhost}
      port: ${REDIS_PORT:6379}
      timeout: 2000ms
```

## Monitoring

### Metrics

- `kafka.streams.records.processed` - количество обработанных записей
- `kafka.streams.records.lagged` - отставание в обработке
- `cache.hit.rate` - процент попаданий в кэш
- `db.query.duration` - время запросов к БД

### Health Checks

- Kafka Streams состояние
- Redis подключение
- Fleet DB подключение
- Топики доступность

## Testing

### Unit Tests

- `ActivityEnrichmentServiceTest` - тестирование логики обогащения
- `HostAgentCacheServiceTest` - тестирование кэш операций
- `FleetHostRepositoryTest` - тестирование репозитория

### Integration Tests

- End-to-end тестирование pipeline
- Тестирование с реальными Debezium событиями
- Тестирование fallback логики

## Deployment

### Docker

```dockerfile
FROM openjdk:17-jre-slim
COPY target/openframe-stream.jar app.jar
ENTRYPOINT ["java", "-jar", "/app.jar"]
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: openframe-stream
spec:
  replicas: 1
  selector:
    matchLabels:
      app: openframe-stream
  template:
    metadata:
      labels:
        app: openframe-stream
    spec:
      containers:
      - name: openframe-stream
        image: openframe/stream:latest
        env:
        - name: SPRING_PROFILES_ACTIVE
          value: "production"
```

## Next Steps

1. **Реализовать фильтрацию Debezium событий** - оставлять только INSERT/UPDATE
2. **Добавить метрики и мониторинг** - Prometheus метрики
3. **Улучшить error handling** - retry логика, dead letter queue
4. **Добавить интеграционные тесты** - тестирование с реальными данными
5. **Оптимизировать производительность** - tuning Kafka Streams параметров
6. **Добавить документацию API** - OpenAPI спецификация 