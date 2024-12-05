package com.openframe.api.dto.fleet;

import lombok.Data;

@Data
public class DeviceInfo {
    private String id;
    private String hostname;
    private String osVersion;
    private String hardwareSerial;
    private String hardwareModel;
    private String status;
} 