package com.openframe.data.dto.device;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InstalledAgent {
    private String id;
    private String machineId;
    private String agentType;
    private String version;
    private String createdAt;
    private String updatedAt;
}
