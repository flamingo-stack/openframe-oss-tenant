package com.openframe.stream.mapping;

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
        registerMapping(IntegratedToolType.MESHCENTRAL, SourceEventTypes.MeshCentral.SERVER_STARTED, UnifiedEventType.SYSTEM_START);

        // MeshCentral etype.action mappings discovered in codebase
        // user.*
        registerMapping(IntegratedToolType.MESHCENTRAL, SourceEventTypes.MeshCentral.USER_LOGIN, UnifiedEventType.LOGIN);
        registerMapping(IntegratedToolType.MESHCENTRAL, SourceEventTypes.MeshCentral.USER_LOGOUT, UnifiedEventType.LOGOUT);
        registerMapping(IntegratedToolType.MESHCENTRAL, SourceEventTypes.MeshCentral.USER_PASSCHANGE, UnifiedEventType.PASSWORD_CHANGED);
        registerMapping(IntegratedToolType.MESHCENTRAL, SourceEventTypes.MeshCentral.USER_ACCOUNTCREATE, UnifiedEventType.USER_CREATED);
        registerMapping(IntegratedToolType.MESHCENTRAL, SourceEventTypes.MeshCentral.USER_ACCOUNTREMOVE, UnifiedEventType.USER_DELETED);
        registerMapping(IntegratedToolType.MESHCENTRAL, SourceEventTypes.MeshCentral.USER_ACCOUNTCHANGE, UnifiedEventType.USER_UPDATED);
        registerMapping(IntegratedToolType.MESHCENTRAL, SourceEventTypes.MeshCentral.USER_LOGIN_TOKEN_CHANGED, UnifiedEventType.USER_LOGIN_TOKEN_CHANGED);
        registerMapping(IntegratedToolType.MESHCENTRAL, SourceEventTypes.MeshCentral.USER_LOGIN_TOKEN_ADDED, UnifiedEventType.USER_LOGIN_TOKEN_ADDED);
        registerMapping(IntegratedToolType.MESHCENTRAL, SourceEventTypes.MeshCentral.USER_UI_CUSTOM_EVENT, UnifiedEventType.USER_UI_CUSTOM_EVENT);
        registerMapping(IntegratedToolType.MESHCENTRAL, SourceEventTypes.MeshCentral.USER_END_SESSION, UnifiedEventType.USER_SESSION_ENDED);

        // mesh.*
        registerMapping(IntegratedToolType.MESHCENTRAL, SourceEventTypes.MeshCentral.MESH_DELETE, UnifiedEventType.GROUP_DELETED);
        registerMapping(IntegratedToolType.MESHCENTRAL, SourceEventTypes.MeshCentral.MESH_CHANGE, UnifiedEventType.GROUP_UPDATED);
        registerMapping(IntegratedToolType.MESHCENTRAL, SourceEventTypes.MeshCentral.MESH_CREATE, UnifiedEventType.GROUP_CREATED);

        // node.*
        registerMapping(IntegratedToolType.MESHCENTRAL, SourceEventTypes.MeshCentral.NODE_ADD, UnifiedEventType.DEVICE_REGISTERED);
        registerMapping(IntegratedToolType.MESHCENTRAL, SourceEventTypes.MeshCentral.NODE_CHANGE, UnifiedEventType.DEVICE_UPDATED);
        registerMapping(IntegratedToolType.MESHCENTRAL, SourceEventTypes.MeshCentral.NODE_REMOVE, UnifiedEventType.DEVICE_DELETED);
        registerMapping(IntegratedToolType.MESHCENTRAL, SourceEventTypes.MeshCentral.NODE_DEVICE_SESSIONS, UnifiedEventType.DEVICE_SESSIONS_UPDATED);
        registerMapping(IntegratedToolType.MESHCENTRAL, SourceEventTypes.MeshCentral.NODE_SYSINFO_HASH, UnifiedEventType.DEVICE_SYSINFO_UPDATED);
        registerMapping(IntegratedToolType.MESHCENTRAL, SourceEventTypes.MeshCentral.NODE_AMT_ACTIVATE, UnifiedEventType.DEVICE_OOB_ACTIVATION_REQUESTED);
        registerMapping(IntegratedToolType.MESHCENTRAL, SourceEventTypes.MeshCentral.NODE_DIAGNOSTIC, UnifiedEventType.DEVICE_DIAGNOSTIC);
        registerMapping(IntegratedToolType.MESHCENTRAL, SourceEventTypes.MeshCentral.NODE_AGENT_LOG, UnifiedEventType.FILE_OPERATION);
        registerMapping(IntegratedToolType.MESHCENTRAL, SourceEventTypes.MeshCentral.NODE_BATCH_UPLOAD, UnifiedEventType.FILE_BATCH_UPLOAD);
        registerMapping(IntegratedToolType.MESHCENTRAL, SourceEventTypes.MeshCentral.NODE_SESSION_COMPRESSION, UnifiedEventType.REMOTE_SESSION_STATS_UPDATED);

        // relay.*
        registerMapping(IntegratedToolType.MESHCENTRAL, SourceEventTypes.MeshCentral.RELAY_LOG, UnifiedEventType.REMOTE_SESSION_EVENT);
        registerMapping(IntegratedToolType.MESHCENTRAL, SourceEventTypes.MeshCentral.RELAY_RECORDING, UnifiedEventType.REMOTE_RECORDING_COMPLETED);

        // ugrp.* (user groups)
        registerMapping(IntegratedToolType.MESHCENTRAL, SourceEventTypes.MeshCentral.UGRP_USERGROUP_CHANGE, UnifiedEventType.USER_GROUP_CHANGED);
        registerMapping(IntegratedToolType.MESHCENTRAL, SourceEventTypes.MeshCentral.UGRP_CREATE_USERGROUP, UnifiedEventType.USER_GROUP_CREATED);
        registerMapping(IntegratedToolType.MESHCENTRAL, SourceEventTypes.MeshCentral.UGRP_DELETE_USERGROUP, UnifiedEventType.USER_GROUP_DELETED);

        // server.*
        registerMapping(IntegratedToolType.MESHCENTRAL, SourceEventTypes.MeshCentral.SERVER_STOPPED, UnifiedEventType.SYSTEM_SHUTDOWN);

        // events without etype
        registerMapping(IntegratedToolType.MESHCENTRAL, SourceEventTypes.MeshCentral.SCAN_AMT_DEVICE, UnifiedEventType.DEVICE_DISCOVERY);
        registerMapping(IntegratedToolType.MESHCENTRAL, SourceEventTypes.MeshCentral.SERVER_TIMELINE_STATS, UnifiedEventType.SYSTEM_MONITORING);
        registerMapping(IntegratedToolType.MESHCENTRAL, SourceEventTypes.MeshCentral.WS_SESSION_COUNT, UnifiedEventType.SESSION_COUNT_UPDATED);

        // Tactical RMM mappings (based on logs_auditlogs structure)
        // Authentication Events
        registerMapping(IntegratedToolType.TACTICAL, SourceEventTypes.Tactical.USER_LOGIN, UnifiedEventType.LOGIN);
        registerMapping(IntegratedToolType.TACTICAL, SourceEventTypes.Tactical.USER_FAILED_LOGIN, UnifiedEventType.LOGIN_FAILED);

        // Device Management Events  
        registerMapping(IntegratedToolType.TACTICAL, SourceEventTypes.Tactical.AGENT_ADD, UnifiedEventType.DEVICE_REGISTERED);
        registerMapping(IntegratedToolType.TACTICAL, SourceEventTypes.Tactical.AGENT_MODIFY, UnifiedEventType.DEVICE_UPDATED);
        registerMapping(IntegratedToolType.TACTICAL, SourceEventTypes.Tactical.AGENT_DELETE, UnifiedEventType.DEVICE_DELETED);
        registerMapping(IntegratedToolType.TACTICAL, SourceEventTypes.Tactical.AGENT_INSTALL, UnifiedEventType.DEVICE_REGISTERED);
        registerMapping(IntegratedToolType.TACTICAL, SourceEventTypes.Tactical.AGENT_REMOTE_SESSION, UnifiedEventType.REMOTE_SESSION_START);

        // User Management Events
        registerMapping(IntegratedToolType.TACTICAL, SourceEventTypes.Tactical.USER_ADD, UnifiedEventType.USER_CREATED);
        registerMapping(IntegratedToolType.TACTICAL, SourceEventTypes.Tactical.USER_MODIFY, UnifiedEventType.USER_UPDATED);
        registerMapping(IntegratedToolType.TACTICAL, SourceEventTypes.Tactical.USER_DELETE, UnifiedEventType.USER_DELETED);
        registerMapping(IntegratedToolType.TACTICAL, SourceEventTypes.Tactical.ROLE_ADD, UnifiedEventType.USER_ROLE_CHANGED);
        registerMapping(IntegratedToolType.TACTICAL, SourceEventTypes.Tactical.ROLE_MODIFY, UnifiedEventType.USER_ROLE_CHANGED);

        // Script & Automation Events
        registerMapping(IntegratedToolType.TACTICAL, SourceEventTypes.Tactical.SCRIPT_ADD, UnifiedEventType.SCRIPT_CREATED);
        registerMapping(IntegratedToolType.TACTICAL, SourceEventTypes.Tactical.SCRIPT_MODIFY, UnifiedEventType.SCRIPT_UPDATED);
        registerMapping(IntegratedToolType.TACTICAL, SourceEventTypes.Tactical.AGENT_EXECUTE_SCRIPT, UnifiedEventType.SCRIPT_EXECUTED);
        registerMapping(IntegratedToolType.TACTICAL, SourceEventTypes.Tactical.AGENT_EXECUTE_COMMAND, UnifiedEventType.COMMAND_RUN_STARTED);
        registerMapping(IntegratedToolType.TACTICAL, SourceEventTypes.Tactical.CMD_RUN_STARTED, UnifiedEventType.COMMAND_RUN_STARTED);
        registerMapping(IntegratedToolType.TACTICAL, SourceEventTypes.Tactical.CMD_RUN_FINISHED, UnifiedEventType.COMMAND_RUN_FINISHED);
        registerMapping(IntegratedToolType.TACTICAL, SourceEventTypes.Tactical.SCRIPT_EXECUTION_STARTED, UnifiedEventType.SCRIPT_EXECUTION_STARTED);
        registerMapping(IntegratedToolType.TACTICAL, SourceEventTypes.Tactical.SCRIPT_EXECUTION_FINISHED, UnifiedEventType.SCRIPT_EXECUTED);
        registerMapping(IntegratedToolType.TACTICAL, SourceEventTypes.Tactical.TASK_RUN_STARTED, UnifiedEventType.SCRIPT_EXECUTION_STARTED);
        registerMapping(IntegratedToolType.TACTICAL, SourceEventTypes.Tactical.TASK_RUN_FINISHED, UnifiedEventType.SCRIPT_EXECUTED);
        registerMapping(IntegratedToolType.TACTICAL, SourceEventTypes.Tactical.AUTOMATED_TASK_ADD, UnifiedEventType.SCRIPT_CREATED);
        registerMapping(IntegratedToolType.TACTICAL, SourceEventTypes.Tactical.AUTOMATED_TASK_MODIFY, UnifiedEventType.SCRIPT_UPDATED);
        registerMapping(IntegratedToolType.TACTICAL, SourceEventTypes.Tactical.AUTOMATED_TASK_RUN, UnifiedEventType.SCRIPT_EXECUTED);

        // Policy & Compliance Events
        registerMapping(IntegratedToolType.TACTICAL, SourceEventTypes.Tactical.POLICY_ADD, UnifiedEventType.POLICY_APPLIED);
        registerMapping(IntegratedToolType.TACTICAL, SourceEventTypes.Tactical.POLICY_MODIFY, UnifiedEventType.POLICY_APPLIED);
        registerMapping(IntegratedToolType.TACTICAL, SourceEventTypes.Tactical.WIN_UPDATE_POLICY_ADD, UnifiedEventType.POLICY_APPLIED);
        registerMapping(IntegratedToolType.TACTICAL, SourceEventTypes.Tactical.WIN_UPDATE_POLICY_MODIFY, UnifiedEventType.POLICY_APPLIED);

        // Monitoring Events
        registerMapping(IntegratedToolType.TACTICAL, SourceEventTypes.Tactical.CHECK_ADD, UnifiedEventType.MONITORING_CHECK_CREATED);
        registerMapping(IntegratedToolType.TACTICAL, SourceEventTypes.Tactical.CHECK_MODIFY, UnifiedEventType.MONITORING_CHECK_CREATED);
        registerMapping(IntegratedToolType.TACTICAL, SourceEventTypes.Tactical.CHECK_RUN, UnifiedEventType.COMPLIANCE_CHECK);
        registerMapping(IntegratedToolType.TACTICAL, SourceEventTypes.Tactical.ALERT_TEMPLATE_ADD, UnifiedEventType.ALERT_TRIGGERED);
        registerMapping(IntegratedToolType.TACTICAL, SourceEventTypes.Tactical.ALERT_TEMPLATE_MODIFY, UnifiedEventType.ALERT_RESOLVED);

        // System Events
        registerMapping(IntegratedToolType.TACTICAL, SourceEventTypes.Tactical.CORE_SETTINGS_MODIFY, UnifiedEventType.SYSTEM_STATUS);
        registerMapping(IntegratedToolType.TACTICAL, SourceEventTypes.Tactical.BULK_ACTION, UnifiedEventType.SYSTEM_STATUS);

        // Group Events (clients/sites)
        registerMapping(IntegratedToolType.TACTICAL, SourceEventTypes.Tactical.CLIENT_ADD, UnifiedEventType.GROUP_CREATED);
        registerMapping(IntegratedToolType.TACTICAL, SourceEventTypes.Tactical.CLIENT_MODIFY, UnifiedEventType.GROUP_UPDATED);
        registerMapping(IntegratedToolType.TACTICAL, SourceEventTypes.Tactical.CLIENT_DELETE, UnifiedEventType.GROUP_DELETED);
        registerMapping(IntegratedToolType.TACTICAL, SourceEventTypes.Tactical.SITE_ADD, UnifiedEventType.GROUP_CREATED);
        registerMapping(IntegratedToolType.TACTICAL, SourceEventTypes.Tactical.SITE_MODIFY, UnifiedEventType.GROUP_UPDATED);
        registerMapping(IntegratedToolType.TACTICAL, SourceEventTypes.Tactical.SITE_DELETE, UnifiedEventType.GROUP_DELETED);

        // Fleet MDM mappings (activity_type column values)
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.USER_LOGGED_IN, UnifiedEventType.LOGIN);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.USER_FAILED_LOGIN, UnifiedEventType.LOGIN_FAILED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.CREATED_USER, UnifiedEventType.USER_CREATED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.CHANGED_USER_GLOBAL_ROLE, UnifiedEventType.USER_ROLE_CHANGED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.FLEET_ENROLLED, UnifiedEventType.DEVICE_REGISTERED);
        // Generic fallbacks / additional common Fleet events
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.DELETED_USER, UnifiedEventType.USER_DELETED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.EDITED_USER, UnifiedEventType.USER_UPDATED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.DELETED_HOST, UnifiedEventType.DEVICE_DELETED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.CHANGED_HOST_STATUS, UnifiedEventType.DEVICE_UPDATED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.POLICY_VIOLATION, UnifiedEventType.POLICY_VIOLATION);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.APPLIED_POLICY, UnifiedEventType.POLICY_APPLIED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.POLICY_COMPLIANCE_CHECKED, UnifiedEventType.COMPLIANCE_CHECK);
        // Remote session events if Fleet supports such activities
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.REMOTE_SESSION_START, UnifiedEventType.REMOTE_SESSION_START);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.REMOTE_SESSION_END, UnifiedEventType.REMOTE_SESSION_END);
        // Alerting / monitoring examples
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.ALERT_TRIGGERED, UnifiedEventType.ALERT_TRIGGERED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.ALERT_RESOLVED, UnifiedEventType.ALERT_RESOLVED);
    }
}
