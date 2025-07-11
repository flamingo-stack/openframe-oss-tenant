package com.openframe.data.model.enums;

import lombok.Getter;

@Getter
public enum UnifiedEventType {
    // Authentication events
    LOGIN("Authentication", "User login event", Severity.INFO),
    LOGOUT("Authentication", "User logout event", Severity.INFO),
    LOGIN_FAILED("Authentication", "Failed login attempt", Severity.WARNING),
    PASSWORD_CHANGED("Authentication", "Password change event", Severity.INFO),
    SESSION_EXPIRED("Authentication", "Session expiration event", Severity.INFO),

    // Device management events
    DEVICE_ONLINE("Device Management", "Device came online", Severity.INFO),
    DEVICE_OFFLINE("Device Management", "Device went offline", Severity.INFO),
    DEVICE_REGISTERED("Device Management", "New device registration", Severity.INFO),
    DEVICE_UPDATED("Device Management", "Device information updated", Severity.INFO),
    DEVICE_DELETED("Device Management", "Device removed", Severity.INFO),

    // User management events
    USER_CREATED("User Management", "New user created", Severity.INFO),
    USER_UPDATED("User Management", "User information updated", Severity.INFO),
    USER_DELETED("User Management", "User removed", Severity.INFO),
    USER_ROLE_CHANGED("User Management", "User role modified", Severity.INFO),

    // Script and automation events
    SCRIPT_EXECUTED("Automation", "Script executed", Severity.INFO),
    SCRIPT_FAILED("Automation", "Script execution failed", Severity.ERROR),
    SCRIPT_CREATED("Automation", "New script created", Severity.INFO),
    SCRIPT_UPDATED("Automation", "Script modified", Severity.INFO),

    // Policy and compliance events
    POLICY_APPLIED("Policy Management", "Policy applied to device", Severity.INFO),
    POLICY_VIOLATION("Policy Management", "Policy violation detected", Severity.WARNING),
    COMPLIANCE_CHECK("Policy Management", "Compliance check performed", Severity.INFO),

    // File and data events
    FILE_TRANSFER("File Management", "File transfer event", Severity.INFO),
    FILE_UPLOADED("File Management", "File uploaded", Severity.INFO),
    FILE_DOWNLOADED("File Management", "File downloaded", Severity.INFO),
    FILE_DELETED("File Management", "File removed", Severity.INFO),

    // Remote access events
    REMOTE_SESSION_START("Remote Access", "Remote session started", Severity.INFO),
    REMOTE_SESSION_END("Remote Access", "Remote session ended", Severity.INFO),
    REMOTE_SESSION_FAILED("Remote Access", "Remote session failed", Severity.INFO),

    // Monitoring and alerting events
    ALERT_TRIGGERED("Monitoring", "Alert triggered", Severity.INFO),
    ALERT_RESOLVED("Monitoring", "Alert resolved", Severity.INFO),
    MONITORING_CHECK_CREATED("Monitoring", "New monitoring check", Severity.INFO),
    MONITORING_CHECK_FAILED("Monitoring", "Monitoring check failed", Severity.ERROR),

    // System events
    SYSTEM_STARTUP("System", "System startup", Severity.INFO),
    SYSTEM_SHUTDOWN("System", "System shutdown", Severity.WARNING),
    SYSTEM_START("System", "System started", Severity.INFO),
    SYSTEM_MONITORING("System", "System monitoring event", Severity.INFO),
    SYSTEM_STATUS("System", "System status update", Severity.INFO),
    SYSTEM_ERROR("System", "System error occurred", Severity.ERROR),

    // Device events
    DEVICE_HEARTBEAT("Device Management", "Device heartbeat", Severity.INFO),

    // Unknown events
    UNKNOWN("Unknown", "Unknown event type", Severity.WARNING);

    private final String category;
    private final String description;
    private final Severity severity;

    UnifiedEventType(String category, String description, Severity severity) {
        this.category = category;
        this.description = description;
        this.severity = severity;
    }
}