package com.openframe.stream.controller;

import com.openframe.stream.service.StreamLifecycleService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.streams.KafkaStreams;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/streams")
@RequiredArgsConstructor
@Slf4j
public class StreamMonitoringController {

    private final StreamLifecycleService streamLifecycleService;

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getStreamStatus() {
        Map<String, Object> status = new HashMap<>();
        
        KafkaStreams.State state = streamLifecycleService.getState();
        boolean isRunning = streamLifecycleService.isRunning();
        
        status.put("state", state.name());
        status.put("running", isRunning);
        status.put("healthy", isRunning);
        
        return ResponseEntity.ok(status);
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> getHealth() {
        Map<String, Object> health = new HashMap<>();
        
        boolean isRunning = streamLifecycleService.isRunning();
        
        if (isRunning) {
            health.put("status", "UP");
            health.put("details", "Kafka Streams is running");
        } else {
            health.put("status", "DOWN");
            health.put("details", "Kafka Streams is not running");
        }
        
        return ResponseEntity.ok(health);
    }
} 