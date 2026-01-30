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
public class DeviceConnection {
    private List<DeviceEdge> edges;
    private Integer filteredCount;
}
