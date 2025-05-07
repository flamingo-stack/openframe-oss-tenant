package com.openframe.client.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AgentTokenResponse {
    private String accessToken;
    private String tokenType = "Bearer";
    private long expiresIn;
} 