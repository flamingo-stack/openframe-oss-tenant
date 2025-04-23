package com.openframe.core.model.device;

import java.time.Instant;
import lombok.Data;

@Data
public class SecurityAlert {
    private String id;
    private String severity;
    private String description;
    private Instant detectedAt;
    private boolean resolved;
    private Instant resolvedAt;
    private String resolution;
} 