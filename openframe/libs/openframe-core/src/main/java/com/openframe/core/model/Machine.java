package com.openframe.core.model;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import com.openframe.core.model.device.*;
import jakarta.validation.constraints.NotBlank;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.Data;

@Data
@Document(collection = "machines")
public class Machine {
    @Id
    private String id;

    @NotBlank
    private String machineId;   // Same as in OAuthClient, used for authentication and as primary ID

    private String ip;
    private String macAddress;
    private String osUuid;
    private String agentVersion;
    private DeviceStatus status;
    private Instant lastSeen;
    private String organizationId;

    private String hostname;

    private String displayName;
    private String serialNumber;
    private String manufacturer;
    private String model;

    private DeviceType type;
    private String osType;
    private String osVersion;
    private String osBuild;
    private String timezone;

    private SecurityState securityState;
    private ComplianceState complianceState;
    private List<SecurityAlert> securityAlerts;
    private Map<String, String> tags;

    private Instant lastSecurityScan;
    private Instant lastComplianceScan;
    private List<ComplianceRequirement> complianceRequirements;

    private Instant registeredAt;  // When device was first registered (replaces createdAt)
    private Instant updatedAt;     // Last time device info was updated (replaces lastModifiedAt)        // "ACTIVE", "OFFLINE", etc.
} 