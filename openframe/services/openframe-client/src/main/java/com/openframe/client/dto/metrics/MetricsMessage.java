package com.openframe.client.dto.metrics;

import lombok.Data;

import java.time.Instant;

@Data
public class MetricsMessage {
    private String machineId;
    private double cpu;
    private double memory;
    private Instant timestamp;
} 