package com.openframe.api.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class SSOConfigRequest {

    @NotBlank(message = "Client ID cannot be empty")
    private String clientId;

    @NotBlank(message = "Client Secret cannot be empty")
    private String clientSecret;
} 