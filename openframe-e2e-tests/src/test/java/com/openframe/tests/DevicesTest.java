package com.openframe.tests;

import com.openframe.data.dto.device.DeviceFilters;
import com.openframe.data.dto.device.DeviceStatus;
import com.openframe.data.dto.device.Machine;
import com.openframe.tests.base.AuthorizedTest;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.List;

import static com.openframe.api.DeviceApi.*;
import static com.openframe.data.generator.DeviceGenerator.*;
import static org.assertj.core.api.AssertionsForInterfaceTypes.assertThat;

@Disabled("Tests disabled - waiting for devices")
@Tag("authorized")
@DisplayName("Devices")
public class DevicesTest extends AuthorizedTest {

    @Test
    @DisplayName("Verify device filters")
    public void testGetDeviceFilters() {
        DeviceFilters filters = getDeviceFilters();
        assertThat(filters).isNotNull();
        assertThat(filters.getStatuses()).isNotEmpty();
        assertThat(filters.getStatuses().getFirst().getValue()).isNotNull();
        assertThat(filters.getStatuses().getFirst().getLabel()).isNotNull();
        assertThat(filters.getStatuses().getFirst().getCount()).isNotZero();
        assertThat(filters.getOsTypes()).isNotEmpty();
        assertThat(filters.getOsTypes().getFirst().getValue()).isNotNull();
        assertThat(filters.getOsTypes().getFirst().getLabel()).isNotNull();
        assertThat(filters.getOsTypes().getFirst().getCount()).isNotZero();
        assertThat(filters.getOrganizationIds()).isNotEmpty();
        assertThat(filters.getOrganizationIds().getFirst().getValue()).isNotNull();
        assertThat(filters.getOrganizationIds().getFirst().getLabel()).isNotNull();
        assertThat(filters.getOrganizationIds().getFirst().getCount()).isNotZero();
        assertThat(filters.getFilteredCount()).isNotZero();
    }

    @Test
    @DisplayName("Get device by machineId")
    public void testGetDevice() {
        List<Machine> devices = getDevices(onlineDevicesFilter());
        assertThat(devices).as("Expected at least one ONLINE device").isNotEmpty();
        Machine device = getDevice(devices.getFirst().getMachineId());
        assertThat(device).isNotNull();
    }

    @Test
    @DisplayName("Search device by hostname")
    public void testSearchDevices() {
        List<String> hostnames = getDeviceHostnames(listedDevicesFilter());
        assertThat(hostnames).as("Expected at least one device with hostname").isNotEmpty();
        Machine device = searchDevice(listedDevicesFilter(), hostnames.getFirst());
        assertThat(device).isNotNull();
        assertThat(device.getHostname()).isEqualTo(hostnames.getFirst());
    }

    @Test
    @DisplayName("Filter devices by status and OS")
    public void testFilterDevices() {
        List<Machine> devices = getDevices(statusAndOSDevicesFilter(DeviceStatus.ONLINE, "WINDOWS"));
        assertThat(devices).as("Expected at least one ONLINE WINDOWS device").isNotEmpty();
        assertThat(devices).allSatisfy(device -> {
            assertThat(device.getStatus()).isEqualTo(DeviceStatus.ONLINE);
            assertThat(device.getOsType()).isEqualTo("WINDOWS");
        });
    }

    @Test
    @DisplayName("Archive device")
    public void testArchiveDevice() {
        List<Machine> devices = getDevices(offlineDevicesFilter());
        assertThat(devices).as("Expected at least one OFFLINE device to archive").isNotEmpty();
        archiveDevice(devices.getFirst());
        List<String> ids = getDeviceIds(listedDevicesFilter());
        assertThat(ids).doesNotContain(devices.getFirst().getMachineId());
    }

    @Test
    @DisplayName("Delete device")
    public void testDeleteDevice() {
        List<Machine> devices = getDevices(offlineDevicesFilter());
        assertThat(devices).as("Expected at least one OFFLINE device to delete").isNotEmpty();
        deleteDevice(devices.getFirst());
        List<String> ids = getDeviceIds(listedDevicesFilter());
        assertThat(ids).doesNotContain(devices.getFirst().getMachineId());
    }
}
