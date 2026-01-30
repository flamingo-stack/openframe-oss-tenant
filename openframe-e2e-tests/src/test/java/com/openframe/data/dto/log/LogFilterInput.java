package com.openframe.data.dto.log;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LogFilterInput {
    private String startDate;
    private String endDate;
    private List<String> eventTypes;
    private List<String> toolTypes;
    private List<String> severities;
    private List<String> organizationIds;
    private String deviceId;
}
