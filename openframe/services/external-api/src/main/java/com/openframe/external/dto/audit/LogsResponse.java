package com.openframe.external.dto.audit;

import com.openframe.external.dto.shared.PageInfo;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.Builder;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Paginated list of logs")
public class LogsResponse {
    
    @Schema(description = "List of log events")
    private List<LogResponse> logs;
    
    @Schema(description = "Pagination information")
    private PageInfo pageInfo;
}