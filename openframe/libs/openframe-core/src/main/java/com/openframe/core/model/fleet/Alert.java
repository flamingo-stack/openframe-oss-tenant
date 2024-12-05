package com.openframe.core.model.fleet;

import java.time.Instant;

import lombok.Data;

@Data
public class Alert {
    private String id;
    private String severity;  // HIGH, MEDIUM, LOW
    private String message;
    private Instant timestamp;
    private boolean resolved;
} 