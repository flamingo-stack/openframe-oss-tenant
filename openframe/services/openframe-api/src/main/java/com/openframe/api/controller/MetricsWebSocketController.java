package com.openframe.api.controller;

import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import com.openframe.api.dto.metrics.MetricsMessage;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Controller
@RequiredArgsConstructor
@Slf4j
public class MetricsWebSocketController {

    private final SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/metrics")
    public MetricsMessage handleMetrics(MetricsMessage message) {
        messagingTemplate.convertAndSend("/topic/metrics", message);
        return message;
    }
} 