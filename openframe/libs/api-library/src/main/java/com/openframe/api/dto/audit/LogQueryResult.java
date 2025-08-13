package com.openframe.api.dto.audit;

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
public class LogQueryResult {
    private List<LogEvent> events;
    private CursorPageInfo pageInfo;
}