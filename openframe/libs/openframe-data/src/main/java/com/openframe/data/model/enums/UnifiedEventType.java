package com.openframe.data.model.enums;

import lombok.Getter;

@Getter
public enum UnifiedEventType {
    // Authentication events
    LOGIN(Severity.INFO, "User logged in"),
    LOGOUT(Severity.INFO, "User logged out"),
    LOGIN_FAILED(Severity.WARNING, "Failed login attempt"),
    PASSWORD_CHANGED(Severity.INFO, "User password changed"),
    SESSION_EXPIRED(Severity.INFO, "User session expired"),

    // Device management events
    DEVICE_ONLINE(Severity.INFO, "Device came online"),
    DEVICE_OFFLINE(Severity.INFO, "Device went offline"),
    DEVICE_REGISTERED(Severity.INFO, "Device registered"),
    DEVICE_UPDATED(Severity.INFO, "Device details updated"),
    DEVICE_DELETED(Severity.INFO, "Device deleted"),

    // User management events
    USER_CREATED(Severity.INFO, "User account created"),
    USER_UPDATED(Severity.INFO, "User account updated"),
    USER_DELETED(Severity.INFO, "User account deleted"),
    USER_ROLE_CHANGED(Severity.INFO, "User roles changed"),

    // Script and automation events
    SCRIPT_EXECUTED(Severity.INFO, "Script executed"),
    SCRIPT_FAILED(Severity.ERROR, "Script execution failed"),
    SCRIPT_CREATED(Severity.INFO, "Script created"),
    SCRIPT_UPDATED(Severity.INFO, "Script updated"),

    // Policy and compliance events
    POLICY_APPLIED(Severity.INFO, "Policy applied"),
    POLICY_VIOLATION(Severity.WARNING, "Policy violation detected"),
    COMPLIANCE_CHECK(Severity.INFO, "Compliance check performed"),

    // File and data events
    FILE_TRANSFER(Severity.INFO, "File transfer completed"),
    FILE_UPLOADED(Severity.INFO, "File uploaded"),
    FILE_DOWNLOADED(Severity.INFO, "File downloaded"),
    FILE_DELETED(Severity.INFO, "File deleted"),

    // Remote access events
    REMOTE_SESSION_START(Severity.INFO, "Remote session started"),
    REMOTE_SESSION_END(Severity.INFO, "Remote session ended"),
    REMOTE_SESSION_FAILED(Severity.INFO, "Remote session failed"),

    // Monitoring and alerting events
    ALERT_TRIGGERED(Severity.INFO, "Alert triggered"),
    ALERT_RESOLVED(Severity.INFO, "Alert resolved"),
    MONITORING_CHECK_CREATED(Severity.INFO, "Monitoring check created"),
    MONITORING_CHECK_FAILED(Severity.ERROR, "Monitoring check failed"),

    // System events
    SYSTEM_STARTUP(Severity.INFO, "System startup"),
    SYSTEM_SHUTDOWN(Severity.WARNING, "System shutdown"),
    SYSTEM_START(Severity.INFO, "System started"),
    SYSTEM_MONITORING(Severity.INFO, "System monitoring event"),
    SYSTEM_STATUS(Severity.INFO, "System status update"),
    SYSTEM_ERROR(Severity.ERROR, "System error occurred"),

    // Device events
    DEVICE_HEARTBEAT(Severity.INFO, "Device heartbeat received"),

    // Unknown events
    UNKNOWN(Severity.WARNING, "Unknown event");

    private final Severity severity;
    private final String summary;

    UnifiedEventType(Severity severity, String summary) {
        this.severity = severity;
        this.summary = summary;
    }
}