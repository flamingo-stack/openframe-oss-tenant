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
@Schema(description = "Tool credentials configuration")
public class ToolCredentialsResponse {
    
    @Schema(description = "Username for authentication", example = "admin")
    private String username;
    
    @Schema(description = "Password for authentication", example = "password123")
    private String password;
    
    @Schema(description = "API key configuration")
    private ToolApiKeyResponse apiKey;
} 