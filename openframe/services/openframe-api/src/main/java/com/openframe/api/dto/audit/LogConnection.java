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
public class LogConnection {
    private List<LogEdge> edges;
    private CursorPageInfo pageInfo;
}