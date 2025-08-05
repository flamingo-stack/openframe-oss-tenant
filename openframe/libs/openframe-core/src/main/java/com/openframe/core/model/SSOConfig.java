package com.openframe.core.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Document(collection = "sso_configs")
@CompoundIndex(def = "{'tenantId': 1, 'provider': 1}", unique = true)
public class SSOConfig {
    @Id
    private String id;
    
    @Indexed
    private String tenantId;
    
    private String provider;
    private String clientId;
    private String clientSecret;
    private boolean enabled;
    private String description;
} 