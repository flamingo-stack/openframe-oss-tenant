package com.openframe.data.generator;

import com.openframe.data.dto.log.LogFilterInput;

import java.util.List;

public class LogGenerator {

    public static LogFilterInput severityAndToolFilter(String severity, String toolType) {
        return LogFilterInput.builder()
                .severities(List.of(severity))
                .toolTypes(List.of(toolType))
                .build();
    }
}
