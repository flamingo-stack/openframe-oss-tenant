package com.openframe.external.dto.tool;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.Builder;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Tool URL configuration")
public class ToolUrlResponse {
    
    @Schema(description = "URL endpoint", example = "https://rmm.example.com")
    private String url;
    
    @Schema(description = "Port number", example = "8443")
    private String port;
    
    @Schema(description = "URL type", example = "DASHBOARD")
    private String type;
} 