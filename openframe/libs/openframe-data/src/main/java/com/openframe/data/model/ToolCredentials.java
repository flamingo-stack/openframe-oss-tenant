package com.openframe.data.model;

import lombok.Data;
import org.springframework.lang.Nullable;

@Data
public class ToolCredentials {
    @Nullable
    private String username;
    @Nullable
    private String password;
    @Nullable
    private String token;
    @Nullable
    private String apiKey;
    @Nullable
    private String clientId;
    @Nullable
    private String clientSecret;
} 