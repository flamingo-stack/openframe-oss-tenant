package com.openframe.external.dto.device;

import com.openframe.data.document.device.DeviceStatus;
import com.openframe.data.document.device.DeviceType;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Device information")
public class DeviceResponse {

    @Schema(description = "Unique device identifier", example = "device-123")
    private String id;

    @Schema(description = "Machine identifier", example = "machine-123")
    private String machineId;

    @Schema(description = "Device hostname", example = "server-01")
    private String hostname;

    @Schema(description = "Device display name", example = "Production Server 01")
    private String displayName;

    @Schema(description = "IP address", example = "192.168.1.100")
    private String ip;

    @Schema(description = "MAC address", example = "00:11:22:33:44:55")
    private String macAddress;

    @Schema(description = "Operating system UUID")
    private String osUuid;

    @Schema(description = "Agent version", example = "1.2.3")
    private String agentVersion;

    @Schema(description = "Device status")
    private DeviceStatus status;

    @Schema(description = "Last seen timestamp")
    private Instant lastSeen;

    @Schema(description = "Organization ID")
    private String organizationId;

    @Schema(description = "Serial number")
    private String serialNumber;

    @Schema(description = "Manufacturer", example = "Dell")
    private String manufacturer;

    @Schema(description = "Model", example = "PowerEdge R740")
    private String model;

    @Schema(description = "Device type")
    private DeviceType type;

    @Schema(description = "Operating system type", example = "Linux")
    private String osType;

    @Schema(description = "Operating system version", example = "Ubuntu 20.04")
    private String osVersion;

    @Schema(description = "Operating system build")
    private String osBuild;

    @Schema(description = "Timezone", example = "UTC")
    private String timezone;

    @Schema(description = "Registration timestamp")
    private Instant registeredAt;

    @Schema(description = "Last update timestamp")
    private Instant updatedAt;

    @Schema(description = "Associated tags")
    private List<TagResponse> tags;
} 