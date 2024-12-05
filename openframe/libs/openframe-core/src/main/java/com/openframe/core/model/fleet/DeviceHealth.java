package com.openframe.core.model.fleet;

import java.util.List;

import lombok.Data;

@Data
public class DeviceHealth {
    private double cpuUsage;
    private double memoryUsage;
    private double diskUsage;
    private List<String> activeProcesses;
    private List<Alert> alerts;
} 