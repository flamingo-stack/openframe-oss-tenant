package com.openframe.api.dto.agent;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ToolConnectionUpdateRequest {
    @NotBlank(message = "agentToolId is required")
    private String agentToolId;
}
