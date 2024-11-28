package com.openframe.api.controller;

import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.openframe.api.service.AnalyticsService;

import ch.qos.logback.classic.Logger;

@RestController
@RequestMapping("/api/v1/analytics")
public class AnalyticsController {
    private final Logger logger = (Logger) LoggerFactory.getLogger(AnalyticsController.class);
    private final AnalyticsService analyticsService;

    public AnalyticsController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    @PostMapping("/query")
    public ResponseEntity<Object> executeQuery(@RequestBody String query) {
        try {
            return ResponseEntity.ok(analyticsService.executeQuery(query));
        } catch (Exception e) {
            logger.error("Error executing query: {}", query, e);
            return ResponseEntity.internalServerError().body("Error executing query: " + e.getMessage());
        }
    }
}
