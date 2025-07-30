package com.openframe.api.dto.device;

import com.openframe.api.dto.shared.CursorPageInfo;
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
    private CursorPageInfo pageInfo;
    private int filteredCount;
}