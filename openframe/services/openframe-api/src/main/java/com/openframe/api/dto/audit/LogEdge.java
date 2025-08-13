package com.openframe.api.dto.audit;

import com.openframe.api.dto.audit.LogEvent;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LogEdge {
    private LogEvent node;
    private String cursor;
}