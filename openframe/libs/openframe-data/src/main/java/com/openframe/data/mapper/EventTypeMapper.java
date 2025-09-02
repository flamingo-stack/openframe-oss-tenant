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
        // Core MeshCentral mappings
        registerMapping(IntegratedToolType.MESHCENTRAL, "server.started", UnifiedEventType.SYSTEM_START); // Direct action mapping

        // MeshCentral etype.action mappings discovered in codebase
        // user.*
        registerMapping(IntegratedToolType.MESHCENTRAL, "user.login", UnifiedEventType.LOGIN);
        registerMapping(IntegratedToolType.MESHCENTRAL, "user.logout", UnifiedEventType.LOGOUT);
        registerMapping(IntegratedToolType.MESHCENTRAL, "user.passchange", UnifiedEventType.PASSWORD_CHANGED);
        registerMapping(IntegratedToolType.MESHCENTRAL, "user.accountcreate", UnifiedEventType.USER_CREATED);
        registerMapping(IntegratedToolType.MESHCENTRAL, "user.accountremove", UnifiedEventType.USER_DELETED);
        registerMapping(IntegratedToolType.MESHCENTRAL, "user.accountchange", UnifiedEventType.USER_UPDATED);
        registerMapping(IntegratedToolType.MESHCENTRAL, "user.loginTokenChanged", UnifiedEventType.USER_LOGIN_TOKEN_CHANGED);
        registerMapping(IntegratedToolType.MESHCENTRAL, "user.loginTokenAdded", UnifiedEventType.USER_LOGIN_TOKEN_ADDED);
        registerMapping(IntegratedToolType.MESHCENTRAL, "user.uicustomevent", UnifiedEventType.USER_UI_CUSTOM_EVENT);
        registerMapping(IntegratedToolType.MESHCENTRAL, "user.endsession", UnifiedEventType.USER_SESSION_ENDED);

        // mesh.*
        registerMapping(IntegratedToolType.MESHCENTRAL, "mesh.deletemesh", UnifiedEventType.GROUP_DELETED);
        registerMapping(IntegratedToolType.MESHCENTRAL, "mesh.meshchange", UnifiedEventType.GROUP_UPDATED);
        registerMapping(IntegratedToolType.MESHCENTRAL, "mesh.createmesh", UnifiedEventType.GROUP_CREATED);

        // node.*
        registerMapping(IntegratedToolType.MESHCENTRAL, "node.addnode", UnifiedEventType.DEVICE_REGISTERED);
        registerMapping(IntegratedToolType.MESHCENTRAL, "node.changenode", UnifiedEventType.DEVICE_UPDATED);
        registerMapping(IntegratedToolType.MESHCENTRAL, "node.removenode", UnifiedEventType.DEVICE_DELETED);
        registerMapping(IntegratedToolType.MESHCENTRAL, "node.devicesessions", UnifiedEventType.DEVICE_SESSIONS_UPDATED);
        registerMapping(IntegratedToolType.MESHCENTRAL, "node.sysinfohash", UnifiedEventType.DEVICE_SYSINFO_UPDATED);
        registerMapping(IntegratedToolType.MESHCENTRAL, "node.amtactivate", UnifiedEventType.DEVICE_OOB_ACTIVATION_REQUESTED);
        registerMapping(IntegratedToolType.MESHCENTRAL, "node.diagnostic", UnifiedEventType.DEVICE_DIAGNOSTIC);
        registerMapping(IntegratedToolType.MESHCENTRAL, "node.agentlog", UnifiedEventType.FILE_OPERATION);
        registerMapping(IntegratedToolType.MESHCENTRAL, "node.batchupload", UnifiedEventType.FILE_BATCH_UPLOAD);
        registerMapping(IntegratedToolType.MESHCENTRAL, "node.sessioncompression", UnifiedEventType.REMOTE_SESSION_STATS_UPDATED);

        // relay.*
        registerMapping(IntegratedToolType.MESHCENTRAL, "relay.relaylog", UnifiedEventType.REMOTE_SESSION_EVENT);
        registerMapping(IntegratedToolType.MESHCENTRAL, "relay.recording", UnifiedEventType.REMOTE_RECORDING_COMPLETED);

        // ugrp.* (user groups)
        registerMapping(IntegratedToolType.MESHCENTRAL, "ugrp.usergroupchange", UnifiedEventType.USER_GROUP_CHANGED);
        registerMapping(IntegratedToolType.MESHCENTRAL, "ugrp.createusergroup", UnifiedEventType.USER_GROUP_CREATED);
        registerMapping(IntegratedToolType.MESHCENTRAL, "ugrp.deleteusergroup", UnifiedEventType.USER_GROUP_DELETED);

        // server.*
        registerMapping(IntegratedToolType.MESHCENTRAL, "server.stopped", UnifiedEventType.SYSTEM_SHUTDOWN);

        // events without etype
        registerMapping(IntegratedToolType.MESHCENTRAL, "scanamtdevice", UnifiedEventType.DEVICE_DISCOVERY);
        registerMapping(IntegratedToolType.MESHCENTRAL, "servertimelinestats", UnifiedEventType.SYSTEM_MONITORING);
        registerMapping(IntegratedToolType.MESHCENTRAL, "wssessioncount", UnifiedEventType.SESSION_COUNT_UPDATED);

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
