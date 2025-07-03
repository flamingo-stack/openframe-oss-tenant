package com.openframe.api.dto.device;

import com.openframe.core.model.Machine;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeviceEdge {
    private Machine node;
    private String cursor;
} 