package com.openframe.api.dto;

import com.openframe.core.model.Machine;
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
    private PageInfo pageInfo;
    private int filteredCount;
} 