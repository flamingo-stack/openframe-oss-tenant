package com.openframe.data.controller;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.openframe.data.model.cassandra.EventStream;
import com.openframe.data.model.mongo.ExternalApplicationEvent;
import com.openframe.data.repository.cassandra.EventStreamRepository;
import com.openframe.data.repository.mongo.ExternalApplicationEventRepository;
import com.openframe.data.service.EventDataService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/test")
@RequiredArgsConstructor
public class TestController {

    private final ExternalApplicationEventRepository mongoRepo;
    private final EventStreamRepository cassandraRepo;
    private final EventDataService eventDataService;

    @GetMapping("/health")
    public Map<String, String> health() {
        Map<String, String> status = new HashMap<>();
        status.put("status", "UP");
        status.put("timestamp", Instant.now().toString());
        return status;
    }

    @PostMapping("/mongo/event")
    public ExternalApplicationEvent createMongoEvent(@RequestBody ExternalApplicationEvent event) {
        event.setTimestamp(Instant.now());
        return mongoRepo.save(event);
    }

    @GetMapping("/mongo/events")
    public List<ExternalApplicationEvent> getMongoEvents() {
        return mongoRepo.findAll();
    }

    @PostMapping("/cassandra/event")
    public EventStream createCassandraEvent(@RequestBody Map<String, String> request) {
        EventStream event = new EventStream();
        EventStream.EventStreamKey key = new EventStream.EventStreamKey();

        key.setUserId(request.get("userId"));
        key.setStreamId(request.get("streamId"));
        key.setEventId(UUID.randomUUID());
        key.setTimestamp(Instant.now());

        event.setKey(key);
        event.setPayload(request.get("payload"));
        event.setEventType(request.get("eventType"));

        Map<String, String> metadata = new HashMap<>();
        metadata.put("createdAt", Instant.now().toString());
        metadata.put("source", "test-api");
        event.setMetadata(metadata);

        return eventDataService.storeEventStream(event);
    }

    @GetMapping("/cassandra/events/{userId}")
    public List<EventStream> getCassandraEvents(@PathVariable String userId) {
        return cassandraRepo.findByUserId(userId);
    }

    @GetMapping("/cassandra/events")
    public List<EventStream> getEventsByTimeRange(
            @RequestParam String userId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant end) {
        return eventDataService.getEventStream(userId, start, end);
    }

    @GetMapping("/cassandra/events/by-type")
    public List<EventStream> getEventsByType(
            @RequestParam String userId,
            @RequestParam String eventType) {
        return eventDataService.findEventsByUserAndType(userId, eventType);
    }
}
