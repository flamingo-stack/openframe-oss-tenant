package com.openframe.core.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Document(collection = "sso_configs")
public class SSOConfig {
    @Id
    private String id;
    private String provider;
    private String clientId;
    private String clientSecret;
    private boolean enabled;
}