package com.openframe.data.dto.device;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ToolConnection {
    private String id;
    private String machineId;
    private String toolType;
    private String agentToolId;
    private ConnectionStatus status;
    private String metadata;
    private String connectedAt;
    private String lastSyncAt;
    private String disconnectedAt;
}
