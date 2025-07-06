package com.openframe.core.model.device.filter;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MachineQueryFilter {
    private List<String> statuses;
    private List<String> deviceTypes;
    private List<String> osTypes;
    private List<String> organizationIds;
    private List<String> tagNames;
} 