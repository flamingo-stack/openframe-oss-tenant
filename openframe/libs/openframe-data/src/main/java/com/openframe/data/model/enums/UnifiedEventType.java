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
    DEVICE_ONLINE(Severity.INFO, "Device is online"),
    DEVICE_OFFLINE(Severity.INFO, "Device is offline"),
    DEVICE_REGISTERED(Severity.INFO, "Device registered"),
    DEVICE_UPDATED(Severity.INFO, "Device details updated"),
    DEVICE_DELETED(Severity.INFO, "Device deleted"),

    // User management events
    USER_CREATED(Severity.INFO, "User account created"),
    USER_UPDATED(Severity.INFO, "User account updated"),
    USER_DELETED(Severity.INFO, "User account deleted"),
    USER_ROLE_CHANGED(Severity.INFO, "User roles changed"),

    // Script and automation events
    SCRIPT_EXECUTION_STARTED(Severity.INFO, "Script execution started"),
    SCRIPT_EXECUTED(Severity.INFO, "Script executed"),
    SCRIPT_FAILED(Severity.ERROR, "Script execution failed"),
    SCRIPT_CREATED(Severity.INFO, "Script created"),
    SCRIPT_UPDATED(Severity.INFO, "Script updated"),

    COMMAND_RUN_STARTED(Severity.INFO, "Command run started"),
    COMMAND_RUN_FINISHED(Severity.INFO, "Command run finished"),

    // Policy and compliance events
    POLICY_APPLIED(Severity.INFO, "Policy applied"),
    POLICY_VIOLATION(Severity.WARNING, "Policy violation detected"),
    COMPLIANCE_CHECK(Severity.INFO, "Compliance check performed"),

    // File and data events
    FILE_TRANSFER(Severity.INFO, "File transfer completed"),
    FILE_UPLOADED(Severity.INFO, "File uploaded"),
    FILE_DOWNLOADED(Severity.INFO, "File downloaded"),
    FILE_DELETED(Severity.INFO, "File deleted"),
    FILE_OPERATION(Severity.INFO, "File operation performed"),
    FILE_BATCH_UPLOAD(Severity.INFO, "Batch file upload started"),

    // Remote access events
    REMOTE_SESSION_START(Severity.INFO, "Remote session started"),
    REMOTE_SESSION_END(Severity.INFO, "Remote session ended"),
    REMOTE_SESSION_FAILED(Severity.INFO, "Remote session failed"),
    REMOTE_RECORDING_COMPLETED(Severity.INFO, "Remote session recording completed"),
    REMOTE_SESSION_EVENT(Severity.INFO, "Remote session event"),
    REMOTE_SESSION_STATS_UPDATED(Severity.INFO, "Remote session stats updated"),

    // Monitoring and alerting events
    ALERT_TRIGGERED(Severity.INFO, "Alert triggered"),
    ALERT_RESOLVED(Severity.INFO, "Alert resolved"),
    MONITORING_CHECK_CREATED(Severity.INFO, "Monitoring check created"),
    MONITORING_CHECK_FAILED(Severity.ERROR, "Monitoring check failed"),

    // System events
    SYSTEM_STARTUP(Severity.INFO, "System startup"),
    SYSTEM_SHUTDOWN(Severity.WARNING, "System shutdown"),
    SYSTEM_START(Severity.INFO, "System started"),
    SYSTEM_MONITORING(Severity.INFO, "System monitoring"),
    SYSTEM_STATUS(Severity.INFO, "System status update"),
    SYSTEM_ERROR(Severity.ERROR, "System error"),

    // Group events (device groups, teams, sites, etc.)
    GROUP_CREATED(Severity.INFO, "Group created"),
    GROUP_UPDATED(Severity.INFO, "Group updated"),
    GROUP_DELETED(Severity.INFO, "Group deleted"),

    // Device events
    DEVICE_HEARTBEAT(Severity.INFO, "Device heartbeat received"),
    DEVICE_SESSIONS_UPDATED(Severity.INFO, "Device sessions updated"),
    DEVICE_SYSINFO_UPDATED(Severity.INFO, "Device system information updated"),
    DEVICE_OOB_ACTIVATION_REQUESTED(Severity.INFO, "Out-of-band activation requested"),
    DEVICE_DIAGNOSTIC(Severity.INFO, "Device diagnostic message"),
    DEVICE_DISCOVERY(Severity.INFO, "Device discovery"),

    // User group events
    USER_GROUP_CREATED(Severity.INFO, "User group created"),
    USER_GROUP_CHANGED(Severity.INFO, "User group changed"),
    USER_GROUP_DELETED(Severity.INFO, "User group deleted"),

    // UI & session events
    USER_UI_CUSTOM_EVENT(Severity.INFO, "User interface custom event"),
    USER_LOGIN_TOKEN_ADDED(Severity.INFO, "User login token added"),
    USER_LOGIN_TOKEN_CHANGED(Severity.INFO, "User login token changed"),
    USER_SESSION_ENDED(Severity.INFO, "User session ended"),
    SESSION_COUNT_UPDATED(Severity.INFO, "Session count updated"),

    // Unknown events
    UNKNOWN(Severity.WARNING, "Unknown event");

    private final Severity severity;
    private final String summary;

    UnifiedEventType(Severity severity, String summary) {
        this.severity = severity;
        this.summary = summary;
    }
}