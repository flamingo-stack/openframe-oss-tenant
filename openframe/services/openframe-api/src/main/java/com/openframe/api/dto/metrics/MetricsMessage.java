package com.openframe.api.dto.metrics;

import java.time.Instant;

import lombok.Data;

@Data
public class MetricsMessage {
    private String machineId;
    private double cpu;
    private double memory;
    private Instant timestamp;
} 