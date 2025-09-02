package com.openframe.data.model.enums;

import lombok.Getter;

@Getter
public enum UnifiedEventType {
    // Authentication events
    LOGIN(Severity.INFO),
    LOGOUT(Severity.INFO),
    LOGIN_FAILED(Severity.WARNING),
    PASSWORD_CHANGED(Severity.INFO),
    SESSION_EXPIRED(Severity.INFO),

    // Device management events
    DEVICE_ONLINE(Severity.INFO),
    DEVICE_OFFLINE(Severity.INFO),
    DEVICE_REGISTERED(Severity.INFO),
    DEVICE_UPDATED(Severity.INFO),
    DEVICE_DELETED(Severity.INFO),

    // User management events
    USER_CREATED(Severity.INFO),
    USER_UPDATED(Severity.INFO),
    USER_DELETED(Severity.INFO),
    USER_ROLE_CHANGED(Severity.INFO),

    // Script and automation events
    SCRIPT_EXECUTED(Severity.INFO),
    SCRIPT_FAILED(Severity.ERROR),
    SCRIPT_CREATED(Severity.INFO),
    SCRIPT_UPDATED(Severity.INFO),

    // Policy and compliance events
    POLICY_APPLIED(Severity.INFO),
    POLICY_VIOLATION(Severity.WARNING),
    COMPLIANCE_CHECK(Severity.INFO),

    // File and data events
    FILE_TRANSFER(Severity.INFO),
    FILE_UPLOADED(Severity.INFO),
    FILE_DOWNLOADED(Severity.INFO),
    FILE_DELETED(Severity.INFO),

    // Remote access events
    REMOTE_SESSION_START(Severity.INFO),
    REMOTE_SESSION_END(Severity.INFO),
    REMOTE_SESSION_FAILED(Severity.INFO),

    // Monitoring and alerting events
    ALERT_TRIGGERED(Severity.INFO),
    ALERT_RESOLVED(Severity.INFO),
    MONITORING_CHECK_CREATED(Severity.INFO),
    MONITORING_CHECK_FAILED(Severity.ERROR),

    // System events
    SYSTEM_STARTUP(Severity.INFO),
    SYSTEM_SHUTDOWN(Severity.WARNING),
    SYSTEM_START(Severity.INFO),
    SYSTEM_MONITORING(Severity.INFO),
    SYSTEM_STATUS(Severity.INFO),
    SYSTEM_ERROR(Severity.ERROR),

    // Device events
    DEVICE_HEARTBEAT(Severity.INFO),

    // Unknown events
    UNKNOWN(Severity.WARNING);

    private final Severity severity;

    UnifiedEventType(Severity severity) {
        this.severity = severity;
    }
}