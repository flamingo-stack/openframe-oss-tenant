package com.openframe.core.model.fleet;

import java.util.List;
import java.util.Map;

import lombok.Data;

@Data
public class DeviceConfiguration {
    private Map<String, String> settings;
    private List<String> installedSoftware;
    private Map<String, String> networkConfig;
    private SecuritySettings security;
} 