package com.openframe.data.generator;

import com.openframe.data.dto.device.DeviceFilterInput;
import com.openframe.data.dto.device.DeviceStatus;
import com.openframe.data.dto.device.DeviceType;

import java.util.List;

public class DeviceGenerator {

    public static DeviceFilterInput activeDevicesFilter() {
        return DeviceFilterInput.builder()
                .statuses(List.of(DeviceStatus.ACTIVE))
                .build();
    }

    public static DeviceFilterInput onlineDevicesFilter() {
        return DeviceFilterInput.builder()
                .statuses(List.of(DeviceStatus.ONLINE))
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

    public static DeviceFilterInput filterByType(DeviceType... types) {
        return DeviceFilterInput.builder()
                .deviceTypes(List.of(types))
                .build();
    }

    public static DeviceFilterInput filterByOrganization(String... organizationIds) {
        return DeviceFilterInput.builder()
                .organizationIds(List.of(organizationIds))
                .build();
    }

    public static DeviceFilterInput filterByTags(String... tagNames) {
        return DeviceFilterInput.builder()
                .tagNames(List.of(tagNames))
                .build();
    }
}
