package com.openframe.data.model.enums;

public enum UnifiedEventType {
    // Authentication events
    LOGIN("Authentication", "User login event"),
    LOGOUT("Authentication", "User logout event"),
    LOGIN_FAILED("Authentication", "Failed login attempt"),
    PASSWORD_CHANGED("Authentication", "Password change event"),
    SESSION_EXPIRED("Authentication", "Session expiration event"),

    // Device management events
    DEVICE_ONLINE("Device Management", "Device came online"),
    DEVICE_OFFLINE("Device Management", "Device went offline"),
    DEVICE_REGISTERED("Device Management", "New device registration"),
    DEVICE_UPDATED("Device Management", "Device information updated"),
    DEVICE_DELETED("Device Management", "Device removed"),

    // User management events
    USER_CREATED("User Management", "New user created"),
    USER_UPDATED("User Management", "User information updated"),
    USER_DELETED("User Management", "User removed"),
    USER_ROLE_CHANGED("User Management", "User role modified"),

    // Script and automation events
    SCRIPT_EXECUTED("Automation", "Script executed"),
    SCRIPT_FAILED("Automation", "Script execution failed"),
    SCRIPT_CREATED("Automation", "New script created"),
    SCRIPT_UPDATED("Automation", "Script modified"),

    // Policy and compliance events
    POLICY_APPLIED("Policy Management", "Policy applied to device"),
    POLICY_VIOLATION("Policy Management", "Policy violation detected"),
    COMPLIANCE_CHECK("Policy Management", "Compliance check performed"),

    // File and data events
    FILE_TRANSFER("File Management", "File transfer event"),
    FILE_UPLOADED("File Management", "File uploaded"),
    FILE_DOWNLOADED("File Management", "File downloaded"),
    FILE_DELETED("File Management", "File removed"),

    // Remote access events
    REMOTE_SESSION_START("Remote Access", "Remote session started"),
    REMOTE_SESSION_END("Remote Access", "Remote session ended"),
    REMOTE_SESSION_FAILED("Remote Access", "Remote session failed"),

    // Monitoring and alerting events
    ALERT_TRIGGERED("Monitoring", "Alert triggered"),
    ALERT_RESOLVED("Monitoring", "Alert resolved"),
    MONITORING_CHECK_CREATED("Monitoring", "New monitoring check"),
    MONITORING_CHECK_FAILED("Monitoring", "Monitoring check failed"),

    // System events
    SYSTEM_STARTUP("System", "System startup"),
    SYSTEM_SHUTDOWN("System", "System shutdown"),
    SYSTEM_ERROR("System", "System error occurred"),

    // Unknown events
    UNKNOWN("Unknown", "Unknown event type");

    private final String category;
    private final String description;

    UnifiedEventType(String category, String description) {
        this.category = category;
        this.description = description;
    }

    public String getCategory() {
        return category;
    }

    public String getDescription() {
        return description;
    }
}