package com.openframe.data.mapper;

import com.openframe.data.model.enums.IntegratedToolType;
import com.openframe.data.model.enums.UnifiedEventType;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.collections4.map.HashedMap;

import java.util.Map;

@Slf4j
public class EventTypeMapper {

    private static final Map<String, UnifiedEventType> mappings = new HashedMap<>();

    static {
        initializeDefaultMappings();
    }

    public static UnifiedEventType mapToUnifiedType(IntegratedToolType toolType, String sourceEventType) {
        String toolName = toolType.getDbName();
        String key = toolName + ":" + sourceEventType;
        UnifiedEventType unifiedType = mappings.get(key);

        if (unifiedType == null) {
            log.debug("No mapping found for {}:{}, using UNKNOWN", toolName, sourceEventType);
            return UnifiedEventType.UNKNOWN;
        }

        log.debug("Mapped {}:{} -> {}", toolName, sourceEventType, unifiedType);
        return unifiedType;
    }

    private static void registerMapping(IntegratedToolType toolName, String sourceEventType, UnifiedEventType unifiedType) {
        String key = toolName.getDbName() + ":" + sourceEventType;
        mappings.put(key, unifiedType);
        log.info("Registered mapping: {}:{} -> {}", toolName.getDbName(), sourceEventType, unifiedType);
    }

    private static void initializeDefaultMappings() {
        // MeshCentral mappings - Updated to match actual event types from deserializer
        registerMapping(IntegratedToolType.MESHCENTRAL, "servertimelinestats", UnifiedEventType.SYSTEM_MONITORING); // Direct action mapping

        // Legacy mappings (keeping for backward compatibility)
        registerMapping(IntegratedToolType.MESHCENTRAL, "user.login", UnifiedEventType.LOGIN);
        registerMapping(IntegratedToolType.MESHCENTRAL, "user.logout", UnifiedEventType.LOGOUT);
        registerMapping(IntegratedToolType.MESHCENTRAL, "server.started", UnifiedEventType.SYSTEM_START); // Direct action mapping
        registerMapping(IntegratedToolType.MESHCENTRAL, "device.connect", UnifiedEventType.DEVICE_ONLINE);
        registerMapping(IntegratedToolType.MESHCENTRAL, "device.disconnect", UnifiedEventType.DEVICE_OFFLINE);
        registerMapping(IntegratedToolType.MESHCENTRAL, "file.transfer", UnifiedEventType.FILE_TRANSFER);
        registerMapping(IntegratedToolType.MESHCENTRAL, "remote.session.start", UnifiedEventType.REMOTE_SESSION_START);
        registerMapping(IntegratedToolType.MESHCENTRAL, "remote.session.end", UnifiedEventType.REMOTE_SESSION_END);
        registerMapping(IntegratedToolType.MESHCENTRAL, "mesh.createmesh", UnifiedEventType.DEVICE_REGISTERED);

        // Additional MeshCentral event type mappings based on actual event data
        registerMapping(IntegratedToolType.MESHCENTRAL, "userconnect", UnifiedEventType.LOGIN);
        registerMapping(IntegratedToolType.MESHCENTRAL, "userdisconnect", UnifiedEventType.LOGOUT);
        registerMapping(IntegratedToolType.MESHCENTRAL, "agentconnect", UnifiedEventType.DEVICE_ONLINE);
        registerMapping(IntegratedToolType.MESHCENTRAL, "agentdisconnect", UnifiedEventType.DEVICE_OFFLINE);
        registerMapping(IntegratedToolType.MESHCENTRAL, "agentinstall", UnifiedEventType.DEVICE_REGISTERED);
        registerMapping(IntegratedToolType.MESHCENTRAL, "agentupdate", UnifiedEventType.DEVICE_UPDATED);
        registerMapping(IntegratedToolType.MESHCENTRAL, "filesend", UnifiedEventType.FILE_TRANSFER);
        registerMapping(IntegratedToolType.MESHCENTRAL, "filereceive", UnifiedEventType.FILE_TRANSFER);
        registerMapping(IntegratedToolType.MESHCENTRAL, "kvmconnect", UnifiedEventType.REMOTE_SESSION_START);
        registerMapping(IntegratedToolType.MESHCENTRAL, "kvmdisconnect", UnifiedEventType.REMOTE_SESSION_END);
        registerMapping(IntegratedToolType.MESHCENTRAL, "terminalconnect", UnifiedEventType.REMOTE_SESSION_START);
        registerMapping(IntegratedToolType.MESHCENTRAL, "terminaldisconnect", UnifiedEventType.REMOTE_SESSION_END);
        registerMapping(IntegratedToolType.MESHCENTRAL, "filesconnect", UnifiedEventType.REMOTE_SESSION_START);
        registerMapping(IntegratedToolType.MESHCENTRAL, "filesdisconnect", UnifiedEventType.REMOTE_SESSION_END);
        registerMapping(IntegratedToolType.MESHCENTRAL, "heartbeat", UnifiedEventType.DEVICE_HEARTBEAT);
        registerMapping(IntegratedToolType.MESHCENTRAL, "status", UnifiedEventType.SYSTEM_STATUS);
        registerMapping(IntegratedToolType.MESHCENTRAL, "serverstatus", UnifiedEventType.SYSTEM_STATUS);

        // Tactical RMM mappings
        registerMapping(IntegratedToolType.TACTICAL, "user.login", UnifiedEventType.LOGIN);
        registerMapping(IntegratedToolType.TACTICAL, "user.logout", UnifiedEventType.LOGOUT);
        registerMapping(IntegratedToolType.TACTICAL, "agent.created", UnifiedEventType.DEVICE_REGISTERED);
        registerMapping(IntegratedToolType.TACTICAL, "agent.updated", UnifiedEventType.DEVICE_UPDATED);
        registerMapping(IntegratedToolType.TACTICAL, "script.executed", UnifiedEventType.SCRIPT_EXECUTED);
        registerMapping(IntegratedToolType.TACTICAL, "check.created", UnifiedEventType.MONITORING_CHECK_CREATED);
        registerMapping(IntegratedToolType.TACTICAL, "alert.triggered", UnifiedEventType.ALERT_TRIGGERED);

        // Fleet MDM mappings (activity_type column values)
        registerMapping(IntegratedToolType.FLEET, "user_logged_in", UnifiedEventType.LOGIN);
        registerMapping(IntegratedToolType.FLEET, "user_failed_login", UnifiedEventType.LOGIN_FAILED);
        registerMapping(IntegratedToolType.FLEET, "created_user", UnifiedEventType.USER_CREATED);
        registerMapping(IntegratedToolType.FLEET, "changed_user_global_role", UnifiedEventType.USER_ROLE_CHANGED);
        registerMapping(IntegratedToolType.FLEET, "fleet_enrolled", UnifiedEventType.DEVICE_REGISTERED);
        // Generic fallbacks / additional common Fleet events
        registerMapping(IntegratedToolType.FLEET, "deleted_user", UnifiedEventType.USER_DELETED);
        registerMapping(IntegratedToolType.FLEET, "edited_user", UnifiedEventType.USER_UPDATED);
        registerMapping(IntegratedToolType.FLEET, "deleted_host", UnifiedEventType.DEVICE_DELETED);
        registerMapping(IntegratedToolType.FLEET, "changed_host_status", UnifiedEventType.DEVICE_UPDATED);
        registerMapping(IntegratedToolType.FLEET, "policy_violation", UnifiedEventType.POLICY_VIOLATION);
        registerMapping(IntegratedToolType.FLEET, "applied_policy", UnifiedEventType.POLICY_APPLIED);
        registerMapping(IntegratedToolType.FLEET, "policy_compliance_checked", UnifiedEventType.COMPLIANCE_CHECK);
        // Remote session events if Fleet supports such activities
        registerMapping(IntegratedToolType.FLEET, "remote_session_start", UnifiedEventType.REMOTE_SESSION_START);
        registerMapping(IntegratedToolType.FLEET, "remote_session_end", UnifiedEventType.REMOTE_SESSION_END);
        // Alerting / monitoring examples
        registerMapping(IntegratedToolType.FLEET, "alert_triggered", UnifiedEventType.ALERT_TRIGGERED);
        registerMapping(IntegratedToolType.FLEET, "alert_resolved", UnifiedEventType.ALERT_RESOLVED);
    }
}
