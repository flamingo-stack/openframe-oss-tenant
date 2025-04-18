package com.openframe.core.model.fleet;

import java.time.Instant;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.Data;

@Data
@Document(collection = "devices")
public class Device {
    @Id
    private String id;
    private String machineId;      // Link to Machine entity
    private String serialNumber;
    private String model;
    private String osVersion;
    private String status;         // ACTIVE, OFFLINE, MAINTENANCE
    private DeviceType type;       // DESKTOP, LAPTOP, SERVER, etc.
    private Instant lastCheckin;
    private DeviceConfiguration configuration;
    private DeviceHealth health;
} 