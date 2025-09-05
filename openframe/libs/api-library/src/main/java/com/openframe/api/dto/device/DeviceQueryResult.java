package com.openframe.api.dto.device;

import com.openframe.api.dto.shared.CursorPageInfo;
import com.openframe.data.document.device.Machine;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeviceQueryResult {
    private List<Machine> devices;
    private CursorPageInfo pageInfo;
    private int filteredCount;
} 