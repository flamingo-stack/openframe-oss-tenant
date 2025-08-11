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
@Schema(description = "Tool API key configuration")
public class ToolApiKeyResponse {
    
    @Schema(description = "API key value", example = "sk-1234567890abcdef")
    private String key;
    
    @Schema(description = "API key type", example = "BEARER_TOKEN")
    private String type;
    
    @Schema(description = "API key name/label", example = "Authorization")
    private String keyName;
} 