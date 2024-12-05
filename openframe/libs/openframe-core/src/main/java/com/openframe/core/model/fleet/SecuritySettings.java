package com.openframe.core.model.fleet;

import java.util.Map;

import lombok.Data;

@Data
public class SecuritySettings {
    private boolean firewallEnabled;
    private boolean antivirusEnabled;
    private String encryptionStatus;
    private String lastSecurityScan;
    private Map<String, String> securityPolicies;
} 