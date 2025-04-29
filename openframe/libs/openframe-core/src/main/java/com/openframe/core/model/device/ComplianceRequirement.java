package com.openframe.core.model.device;

import java.time.Instant;
import lombok.Data;

@Data
public class ComplianceRequirement {
    private String standard; // e.g., "NIST", "ISO27001"
    private String control;
    private boolean compliant;
    private String details;
    private Instant lastCheck;
} 