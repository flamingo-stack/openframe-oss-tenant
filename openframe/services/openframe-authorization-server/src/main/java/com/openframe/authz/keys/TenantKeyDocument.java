package com.openframe.authz.keys;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@Document(collection = "tenant_keys")
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


