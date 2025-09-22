package com.openframe.data.builders;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;
import java.util.Random;
import java.util.UUID;

/**
 * Test data builder for Device objects
 * Fixed: Uses HashMap copies instead of modifying immutable maps
 */
public class DeviceTestDataBuilder {
    
    private static final Random random = new Random();
    
    /**
     * Creates a basic device with default values
     * Uses Map.of() for immutable template
     */
    private static Map<String, Object> createDevice() {
        return Map.of(
            "id", UUID.randomUUID().toString(),
            "hostname", "test-device-" + random.nextInt(1000),
            "operatingSystem", "Linux",
            "status", "online",
            "lastSeen", LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME),
            "ipAddress", "192.168.1." + (random.nextInt(254) + 1),
            "userId", "user-" + UUID.randomUUID().toString(),
            "tenantId", "tenant-" + UUID.randomUUID().toString()
        );
    }
    
    /**
     * Creates device with specific hostname
     * Fixed: Creates mutable copy of immutable template
     */
    public static Map<String, Object> createDeviceWithHostname(String hostname) {
        Map<String, Object> device = new HashMap<>(createDevice());  // ← Mutable copy!
        device.put("hostname", hostname);
        return device;
    }
    
    /**
     * Creates device with specific status
     * Fixed: Creates mutable copy of immutable template
     */
    public static Map<String, Object> createDeviceWithStatus(String status) {
        Map<String, Object> device = new HashMap<>(createDevice());  // ← Mutable copy!
        device.put("status", status);
        return device;
    }
    
    /**
     * Creates device with specific operating system
     * Fixed: Creates mutable copy of immutable template
     */
    public static Map<String, Object> createDeviceWithOS(String operatingSystem) {
        Map<String, Object> device = new HashMap<>(createDevice());  // ← Mutable copy!
        device.put("operatingSystem", operatingSystem);
        return device;
    }
    
    /**
     * Creates device with specific IP address
     * Fixed: Creates mutable copy of immutable template
     */
    public static Map<String, Object> createDeviceWithIP(String ipAddress) {
        Map<String, Object> device = new HashMap<>(createDevice());  // ← Mutable copy!
        device.put("ipAddress", ipAddress);
        return device;
    }
    
    /**
     * Creates device with specific user ID
     * Fixed: Creates mutable copy of immutable template
     */
    public static Map<String, Object> createDeviceWithUserId(String userId) {
        Map<String, Object> device = new HashMap<>(createDevice());  // ← Mutable copy!
        device.put("userId", userId);
        return device;
    }
    
    /**
     * Creates device with multiple custom properties
     * Fixed: Creates mutable copy of immutable template
     */
    public static Map<String, Object> createDeviceWithProperties(Map<String, Object> properties) {
        Map<String, Object> device = new HashMap<>(createDevice());  // ← Mutable copy!
        device.putAll(properties);  // Add all custom properties
        return device;
    }
    
    /**
     * Creates a completely random device
     */
    public static Map<String, Object> createRandomDevice() {
        return new HashMap<>(createDevice());  // Already random, just return mutable copy
    }
    
    // ========== Edge Case Builders ==========
    
    public static class EdgeCaseBuilder {
        
        /**
         * Creates device with null hostname
         * Fixed: Creates mutable copy of immutable template
         */
        public static Map<String, Object> createDeviceWithNullHostname() {
            Map<String, Object> device = new HashMap<>(createDevice());  // ← Mutable copy!
            device.put("hostname", null);
            return device;
        }
        
        /**
         * Creates device with empty hostname
         * Fixed: Creates mutable copy of immutable template
         */
        public static Map<String, Object> createDeviceWithEmptyHostname() {
            Map<String, Object> device = new HashMap<>(createDevice());  // ← Mutable copy!
            device.put("hostname", "");
            return device;
        }
        
        /**
         * Creates device with very long hostname
         * Fixed: Creates mutable copy of immutable template
         */
        public static Map<String, Object> createDeviceWithLongHostname() {
            Map<String, Object> device = new HashMap<>(createDevice());  // ← Mutable copy!
            device.put("hostname", "very-long-hostname-that-exceeds-normal-limits-" + "x".repeat(100));
            return device;
        }
        
        /**
         * Creates device with invalid IP address
         * Fixed: Creates mutable copy of immutable template
         */
        public static Map<String, Object> createDeviceWithInvalidIP() {
            Map<String, Object> device = new HashMap<>(createDevice());  // ← Mutable copy!
            device.put("ipAddress", "999.999.999.999");
            return device;
        }
        
        /**
         * Creates device with special characters in hostname
         * Fixed: Creates mutable copy of immutable template
         */
        public static Map<String, Object> createDeviceWithSpecialCharacters() {
            Map<String, Object> device = new HashMap<>(createDevice());  // ← Mutable copy!
            device.put("hostname", "test-device-@#$%^&*()");
            return device;
        }
    }
    
    // ========== Preset Builders ==========
    
    public static class PresetBuilder {
        
        /**
         * Creates a Windows server device
         * Fixed: Creates mutable copy of immutable template
         */
        public static Map<String, Object> createWindowsServer() {
            Map<String, Object> device = new HashMap<>(createDevice());  // ← Mutable copy!
            device.put("operatingSystem", "Windows Server 2022");
            device.put("hostname", "win-server-" + random.nextInt(100));
            device.put("status", "online");
            return device;
        }
        
        /**
         * Creates a Linux workstation device
         * Fixed: Creates mutable copy of immutable template
         */
        public static Map<String, Object> createLinuxWorkstation() {
            Map<String, Object> device = new HashMap<>(createDevice());  // ← Mutable copy!
            device.put("operatingSystem", "Ubuntu 22.04");
            device.put("hostname", "ubuntu-ws-" + random.nextInt(100));
            device.put("status", "online");
            return device;
        }
        
        /**
         * Creates a macOS device
         * Fixed: Creates mutable copy of immutable template
         */
        public static Map<String, Object> createMacOSDevice() {
            Map<String, Object> device = new HashMap<>(createDevice());  // ← Mutable copy!
            device.put("operatingSystem", "macOS Sonoma");
            device.put("hostname", "mac-" + random.nextInt(100));
            device.put("status", "online");
            return device;
        }
        
        /**
         * Creates an offline device
         * Fixed: Creates mutable copy of immutable template
         */
        public static Map<String, Object> createOfflineDevice() {
            Map<String, Object> device = new HashMap<>(createDevice());  // ← Mutable copy!
            device.put("status", "offline");
            device.put("lastSeen", LocalDateTime.now().minusHours(2).format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
            return device;
        }
        
        /**
         * Creates a device in maintenance mode
         * Fixed: Creates mutable copy of immutable template
         */
        public static Map<String, Object> createMaintenanceDevice() {
            Map<String, Object> device = new HashMap<>(createDevice());  // ← Mutable copy!
            device.put("status", "maintenance");
            device.put("lastSeen", LocalDateTime.now().minusMinutes(5).format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
            return device;
        }
    }
    
    // ========== Utility Methods ==========
    
    /**
     * Creates a list of devices for bulk testing
     */
    public static java.util.List<Map<String, Object>> createDeviceList(int count) {
        return java.util.stream.IntStream.range(0, count)
            .mapToObj(i -> createRandomDevice())
            .collect(java.util.stream.Collectors.toList());
    }
    
    /**
     * Creates devices with different operating systems
     */
    public static java.util.List<Map<String, Object>> createDevicesWithDifferentOS() {
        return java.util.List.of(
            PresetBuilder.createWindowsServer(),
            PresetBuilder.createLinuxWorkstation(),
            PresetBuilder.createMacOSDevice()
        );
    }
    
    /**
     * Creates devices with different statuses
     */
    public static java.util.List<Map<String, Object>> createDevicesWithDifferentStatuses() {
        return java.util.List.of(
            createDeviceWithStatus("online"),
            createDeviceWithStatus("offline"),
            createDeviceWithStatus("maintenance"),
            createDeviceWithStatus("error")
        );
    }
}