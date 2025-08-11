package com.openframe.authz.keys;

import lombok.Data;
import org.springframework.data.annotation.Id;

import java.time.Instant;

@Data
public class TenantKeyDocument {
    @Id
    private String id;
    private String tenantId;
    private String keyId;
    private String publicPem;
    private String privateEncrypted;
    private boolean active;
    private Instant createdAt;
    private Instant rotatedAt;
}


