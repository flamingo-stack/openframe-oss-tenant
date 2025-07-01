package com.openframe.core.model;

import java.time.Instant;
import java.util.List;

import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Transient;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import com.openframe.core.model.device.ComplianceRequirement;
import com.openframe.core.model.device.ComplianceState;
import com.openframe.core.model.device.DeviceStatus;
import com.openframe.core.model.device.DeviceType;
import com.openframe.core.model.device.SecurityAlert;
import com.openframe.core.model.device.SecurityState;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
@Document(collection = "machines")
@CompoundIndexes({
    @CompoundIndex(name = "status_type_org_idx", def = "{'status': 1, 'type': 1, 'organizationId': 1}")
})
public class Machine {
    @Id
    private String id;

    @NotBlank
    private String machineId;   // Same as in OAuthClient, used for authentication and as primary ID

    private String ip;
    private String macAddress;
    private String osUuid;
    private String agentVersion;
    @Indexed
    private DeviceStatus status;
    private Instant lastSeen;
    @Indexed
    private String organizationId;

    private String hostname;
    private String displayName;
    private String serialNumber;
    private String manufacturer;
    private String model;

    @Indexed
    private DeviceType type;
    @Indexed
    private String osType;
    private String osVersion;
    private String osBuild;
    private String timezone;

    private SecurityState securityState;
    private ComplianceState complianceState;
    private List<SecurityAlert> securityAlerts;

    private Instant lastSecurityScan;
    private Instant lastComplianceScan;
    private List<ComplianceRequirement> complianceRequirements;

    private Instant registeredAt;  // When device was first registered (replaces createdAt)
    private Instant updatedAt;     // Last time device info was updated (replaces lastModifiedAt)

    @Transient
    private List<Tag> tags;
}