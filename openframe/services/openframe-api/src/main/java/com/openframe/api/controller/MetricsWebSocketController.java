package com.openframe.api.controller;

import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

import com.openframe.api.dto.metrics.MetricsMessage;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Controller
@RequiredArgsConstructor
@Slf4j
public class MetricsWebSocketController {

    @MessageMapping("/metrics")
    @SendTo("/topic/metrics")
    public MetricsMessage handleMetrics(MetricsMessage message) {
        log.info("Received metrics: {}", message);
        // Process metrics here
        return message; // Echo back for testing
    }
} 