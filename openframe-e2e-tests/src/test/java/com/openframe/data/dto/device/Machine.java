package com.openframe.data.dto.device;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Machine {
    private String id;
    private String machineId;
    private String ip;
    private String macAddress;
    private String osUuid;
    private String agentVersion;
    private DeviceStatus status;
    private String lastSeen;
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
    private String registeredAt;
    private String updatedAt;
    private List<Tag> tags;
    private List<ToolConnection> toolConnections;
    private List<InstalledAgent> installedAgents;
}
