package com.openframe.data.builders;

import net.datafaker.Faker;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

/**
 * Test data builder for device-related entities
 */
public class DeviceTestDataBuilder {
    
    private static final Faker faker = new Faker();
    private static final String[] OPERATING_SYSTEMS = {"Windows", "Linux", "macOS", "Ubuntu", "CentOS", "Debian"};
    private static final String[] DEVICE_TYPES = {"SERVER", "WORKSTATION", "LAPTOP", "DESKTOP", "VIRTUAL_MACHINE"};
    private static final String[] DEVICE_STATUSES = {"ACTIVE", "INACTIVE", "MAINTENANCE", "OFFLINE"};

    /**
     * Create a single device with random data
     * @return Map representing device data
     */
    public static Map<String, Object> createDevice() {
        return Map.of(
            "hostname", faker.internet().domainName(),
            "operatingSystem", faker.options().option(OPERATING_SYSTEMS),
            "ipAddress", faker.internet().ipV4Address(),
            "status", "ACTIVE",
            "machineId", faker.internet().uuid(),
            "type", faker.options().option(DEVICE_TYPES),
            "lastSeen", LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME),
            "agentVersion", "1.0.0"
        );
    }

    /**
     * Create multiple devices with random data
     * @param count number of devices to create
     * @return list of device data maps
     */
    public static List<Map<String, Object>> createDevices(int count) {
        return IntStream.range(0, count)
                .mapToObj(i -> createDevice())
                .collect(Collectors.toList());
    }

    /**
     * Create a device with specific hostname
     * @param hostname device hostname
     * @return Map representing device data
     */
    public static Map<String, Object> createDeviceWithHostname(String hostname) {
        Map<String, Object> device = createDevice();
        device.put("hostname", hostname);
        return device;
    }

    /**
     * Create a device with specific status
     * @param status device status
     * @return Map representing device data
     */
    public static Map<String, Object> createDeviceWithStatus(String status) {
        Map<String, Object> device = createDevice();
        device.put("status", status);
        return device;
    }

    /**
     * Create a device with random status
     * @return Map representing device data
     */
    public static Map<String, Object> createDeviceWithRandomStatus() {
        Map<String, Object> device = createDevice();
        device.put("status", faker.options().option(DEVICE_STATUSES));
        return device;
    }

    /**
     * Create a device with specific operating system
     * @param operatingSystem device OS
     * @return Map representing device data
     */
    public static Map<String, Object> createDeviceWithOS(String operatingSystem) {
        Map<String, Object> device = createDevice();
        device.put("operatingSystem", operatingSystem);
        return device;
    }

    /**
     * Create agent data for device registration
     * @param hostname device hostname
     * @return Map representing agent registration data
     */
    public static Map<String, Object> createAgentData(String hostname) {
        return Map.of(
            "hostname", hostname,
            "operatingSystem", faker.options().option(OPERATING_SYSTEMS),
            "architecture", faker.options().option("x64", "x86", "arm64"),
            "version", "1.0.0",
            "ipAddress", faker.internet().ipV4Address(),
            "macAddress", faker.internet().macAddress(),
            "cpuInfo", Map.of(
                "model", faker.options().option("Intel i7", "AMD Ryzen", "Apple M1"),
                "cores", faker.number().numberBetween(2, 16)
            ),
            "memoryInfo", Map.of(
                "total", faker.number().numberBetween(4, 64) + "GB",
                "available", faker.number().numberBetween(1, 32) + "GB"
            )
        );
    }

    /**
     * Edge case builders for testing boundary conditions
     */
    public static class EdgeCaseBuilder {
        
        /**
         * Create device with very long hostname
         * @return device with long hostname
         */
        public static Map<String, Object> veryLongHostname() {
            Map<String, Object> device = createDevice();
            device.put("hostname", faker.lorem().characters(255));
            return device;
        }
        
        /**
         * Create device with special characters in hostname
         * @return device with special characters
         */
        public static Map<String, Object> specialCharactersHostname() {
            Map<String, Object> device = createDevice();
            device.put("hostname", "test-device_123.domain.com");
            return device;
        }
        
        /**
         * Create device with invalid IP address
         * @return device with invalid IP
         */
        public static Map<String, Object> invalidIpAddress() {
            Map<String, Object> device = createDevice();
            device.put("ipAddress", "999.999.999.999");
            return device;
        }
        
        /**
         * Create device with empty fields
         * @return device with empty fields
         */
        public static Map<String, Object> emptyFields() {
            return Map.of(
                "hostname", "",
                "operatingSystem", "",
                "ipAddress", "",
                "status", "",
                "machineId", "",
                "type", ""
            );
        }
        
        /**
         * Create offline device
         * @return device with OFFLINE status
         */
        public static Map<String, Object> offlineDevice() {
            return createDeviceWithStatus("OFFLINE");
        }
        
        /**
         * Create device in maintenance mode
         * @return device with MAINTENANCE status
         */
        public static Map<String, Object> maintenanceDevice() {
            return createDeviceWithStatus("MAINTENANCE");
        }
    }

    /**
     * Preset builders for common device configurations
     */
    public static class PresetBuilder {
        
        /**
         * Create Windows server device
         * @return Windows server device
         */
        public static Map<String, Object> windowsServer() {
            Map<String, Object> device = createDevice();
            device.put("operatingSystem", "Windows Server 2022");
            device.put("type", "SERVER");
            return device;
        }
        
        /**
         * Create Linux workstation device
         * @return Linux workstation device
         */
        public static Map<String, Object> linuxWorkstation() {
            Map<String, Object> device = createDevice();
            device.put("operatingSystem", "Ubuntu 22.04");
            device.put("type", "WORKSTATION");
            return device;
        }
        
        /**
         * Create macOS laptop device
         * @return macOS laptop device
         */
        public static Map<String, Object> macOSLaptop() {
            Map<String, Object> device = createDevice();
            device.put("operatingSystem", "macOS Ventura");
            device.put("type", "LAPTOP");
            return device;
        }
    }
}
