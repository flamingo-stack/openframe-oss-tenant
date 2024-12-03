package com.openframe.core.model;

import java.time.Instant;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.Data;

@Data
@Document(collection = "machines")
public class Machine {
    @Id
    private String id;
    private String machineId;      // Same as in OAuthClient
    private String hostname;
    private String ip;
    private String macAddress;
    private String osUuid;
    private String agentVersion;
    private Instant lastSeen;
    private String status;         // "ACTIVE", "OFFLINE", etc.
} 