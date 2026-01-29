package com.openframe.data.generator;

import com.openframe.data.dto.device.DeviceFilterInput;
import com.openframe.data.dto.device.DeviceStatus;

import java.util.List;

public class DeviceGenerator {

    public static DeviceFilterInput onlineDevicesFilter() {
        return DeviceFilterInput.builder()
                .statuses(List.of(DeviceStatus.ONLINE))
                .build();
    }

    public static DeviceFilterInput offlineDevicesFilter() {
        return DeviceFilterInput.builder()
                .statuses(List.of(DeviceStatus.OFFLINE))
                .build();
    }

    public static DeviceFilterInput statusAndOSDevicesFilter(DeviceStatus status, String os) {
        return DeviceFilterInput.builder()
                .statuses(List.of(status))
                .osTypes(List.of(os))
                .build();
    }

    public static DeviceFilterInput listedDevicesFilter() {
        return filterDevicesByStatus(
                DeviceStatus.ONLINE,
                DeviceStatus.OFFLINE,
                DeviceStatus.ACTIVE,
                DeviceStatus.INACTIVE,
                DeviceStatus.MAINTENANCE,
                DeviceStatus.DECOMMISSIONED,
                DeviceStatus.PENDING);
    }

    public static DeviceFilterInput filterDevicesByStatus(DeviceStatus... statuses) {
        return DeviceFilterInput.builder()
                .statuses(List.of(statuses))
                .build();
    }
}
