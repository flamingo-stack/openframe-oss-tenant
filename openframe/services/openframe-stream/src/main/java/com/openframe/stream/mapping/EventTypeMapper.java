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
        
        // Authentication Events
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.USER_LOGGED_IN, UnifiedEventType.LOGIN);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.USER_FAILED_LOGIN, UnifiedEventType.LOGIN_FAILED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.USER_ADDED_BY_SSO, UnifiedEventType.USER_CREATED);
        
        // User Management Events
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.CREATED_USER, UnifiedEventType.USER_CREATED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.DELETED_USER, UnifiedEventType.USER_DELETED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.CHANGED_USER_GLOBAL_ROLE, UnifiedEventType.USER_ROLE_CHANGED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.DELETED_USER_GLOBAL_ROLE, UnifiedEventType.USER_ROLE_CHANGED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.CHANGED_USER_TEAM_ROLE, UnifiedEventType.USER_ROLE_CHANGED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.DELETED_USER_TEAM_ROLE, UnifiedEventType.USER_ROLE_CHANGED);
        
        // Device Enrollment Events
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.FLEET_ENROLLED, UnifiedEventType.DEVICE_REGISTERED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.MDM_ENROLLED, UnifiedEventType.MDM_ENROLLED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.MDM_UNENROLLED, UnifiedEventType.MDM_UNENROLLED);
        
        // Activity Automations
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.ENABLED_ACTIVITY_AUTOMATIONS, UnifiedEventType.AUTOMATION_ENABLED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.EDITED_ACTIVITY_AUTOMATIONS, UnifiedEventType.AUTOMATION_UPDATED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.DISABLED_ACTIVITY_AUTOMATIONS, UnifiedEventType.AUTOMATION_DISABLED);
        
        // Pack Management
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.CREATED_PACK, UnifiedEventType.PACK_CREATED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.EDITED_PACK, UnifiedEventType.PACK_UPDATED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.DELETED_PACK, UnifiedEventType.PACK_DELETED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.APPLIED_SPEC_PACK, UnifiedEventType.PACK_APPLIED);
        
        // Policy Management
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.CREATED_POLICY, UnifiedEventType.POLICY_APPLIED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.EDITED_POLICY, UnifiedEventType.POLICY_APPLIED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.DELETED_POLICY, UnifiedEventType.POLICY_APPLIED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.APPLIED_SPEC_POLICY, UnifiedEventType.POLICY_APPLIED);
        
        // Saved Query Management
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.CREATED_SAVED_QUERY, UnifiedEventType.QUERY_CREATED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.EDITED_SAVED_QUERY, UnifiedEventType.QUERY_UPDATED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.DELETED_SAVED_QUERY, UnifiedEventType.QUERY_DELETED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.DELETED_MULTIPLE_SAVED_QUERY, UnifiedEventType.QUERY_DELETED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.APPLIED_SPEC_SAVED_QUERY, UnifiedEventType.QUERY_UPDATED);
        
        // Team Management
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.CREATED_TEAM, UnifiedEventType.GROUP_CREATED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.DELETED_TEAM, UnifiedEventType.GROUP_DELETED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.APPLIED_SPEC_TEAM, UnifiedEventType.GROUP_UPDATED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.TRANSFERRED_HOSTS, UnifiedEventType.DEVICE_UPDATED);
        
        // Agent Options
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.EDITED_AGENT_OPTIONS, UnifiedEventType.CONFIGURATION_UPDATED);
        
        // Queries
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.LIVE_QUERY, UnifiedEventType.QUERY_EXECUTED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.EXECUTE_SCHEDULED_QUERY, UnifiedEventType.QUERY_EXECUTED);

        // OS Version Requirements
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.EDITED_MACOS_MIN_VERSION, UnifiedEventType.CONFIGURATION_UPDATED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.EDITED_IOS_MIN_VERSION, UnifiedEventType.CONFIGURATION_UPDATED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.EDITED_IPADOS_MIN_VERSION, UnifiedEventType.CONFIGURATION_UPDATED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.EDITED_WINDOWS_UPDATES, UnifiedEventType.CONFIGURATION_UPDATED);
        
        // Disk Encryption
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.READ_HOST_DISK_ENCRYPTION_KEY, UnifiedEventType.DISK_ENCRYPTION_KEY_READ);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.ENABLED_MACOS_DISK_ENCRYPTION, UnifiedEventType.DISK_ENCRYPTION_ENABLED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.DISABLED_MACOS_DISK_ENCRYPTION, UnifiedEventType.DISK_ENCRYPTION_DISABLED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.ESCROWED_DISK_ENCRYPTION_KEY, UnifiedEventType.DISK_ENCRYPTION_KEY_ESCROWED);
        
        // macOS Profiles
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.CREATED_MACOS_PROFILE, UnifiedEventType.PROFILE_CREATED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.EDITED_MACOS_PROFILE, UnifiedEventType.PROFILE_UPDATED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.DELETED_MACOS_PROFILE, UnifiedEventType.PROFILE_DELETED);
        
        // macOS Setup Assistant
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.CHANGED_MACOS_SETUP_ASSISTANT, UnifiedEventType.CONFIGURATION_UPDATED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.DELETED_MACOS_SETUP_ASSISTANT, UnifiedEventType.CONFIGURATION_DELETED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.ENABLED_MACOS_SETUP_END_USER_AUTH, UnifiedEventType.CONFIGURATION_UPDATED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.DISABLED_MACOS_SETUP_END_USER_AUTH, UnifiedEventType.CONFIGURATION_UPDATED);
        
        // GitOps
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.ENABLED_GITOPS_MODE, UnifiedEventType.CONFIGURATION_UPDATED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.DISABLED_GITOPS_MODE, UnifiedEventType.CONFIGURATION_UPDATED);
        
        // Bootstrap Package
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.ADDED_BOOTSTRAP_PACKAGE, UnifiedEventType.CONFIGURATION_CREATED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.DELETED_BOOTSTRAP_PACKAGE, UnifiedEventType.CONFIGURATION_DELETED);
        
        // MDM Platform Support
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.ENABLED_WINDOWS_MDM, UnifiedEventType.MDM_ENABLED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.DISABLED_WINDOWS_MDM, UnifiedEventType.MDM_DISABLED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.ENABLED_ANDROID_MDM, UnifiedEventType.MDM_ENABLED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.DISABLED_ANDROID_MDM, UnifiedEventType.MDM_DISABLED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.ENABLED_WINDOWS_MDM_MIGRATION, UnifiedEventType.MDM_ENABLED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.DISABLED_WINDOWS_MDM_MIGRATION, UnifiedEventType.MDM_DISABLED);
        
        // Script Management
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.RAN_SCRIPT, UnifiedEventType.SCRIPT_EXECUTED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.ADDED_SCRIPT, UnifiedEventType.SCRIPT_CREATED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.EDITED_SCRIPT, UnifiedEventType.SCRIPT_UPDATED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.UPDATED_SCRIPT, UnifiedEventType.SCRIPT_UPDATED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.DELETED_SCRIPT, UnifiedEventType.SCRIPT_UPDATED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.CANCELED_RUN_SCRIPT, UnifiedEventType.SCRIPT_FAILED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.RAN_SCRIPT_BATCH, UnifiedEventType.BATCH_OPERATION_COMPLETED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.SCHEDULED_SCRIPT_BATCH, UnifiedEventType.BATCH_OPERATION_STARTED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.CANCELED_SCRIPT_BATCH, UnifiedEventType.BATCH_OPERATION_CANCELED);
        
        // Windows Profiles
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.CREATED_WINDOWS_PROFILE, UnifiedEventType.PROFILE_CREATED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.EDITED_WINDOWS_PROFILE, UnifiedEventType.PROFILE_UPDATED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.DELETED_WINDOWS_PROFILE, UnifiedEventType.PROFILE_DELETED);
        
        // Host Actions
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.LOCKED_HOST, UnifiedEventType.HOST_LOCKED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.UNLOCKED_HOST, UnifiedEventType.HOST_UNLOCKED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.WIPED_HOST, UnifiedEventType.HOST_WIPED);
        
        // Declaration Profiles
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.CREATED_DECLARATION_PROFILE, UnifiedEventType.PROFILE_CREATED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.EDITED_DECLARATION_PROFILE, UnifiedEventType.PROFILE_UPDATED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.DELETED_DECLARATION_PROFILE, UnifiedEventType.PROFILE_DELETED);
        
        // Configuration Profiles
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.RESENT_CONFIGURATION_PROFILE, UnifiedEventType.PROFILE_APPLIED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.RESENT_CONFIGURATION_PROFILE_BATCH, UnifiedEventType.BATCH_OPERATION_COMPLETED);
        
        // Software Management
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.INSTALLED_SOFTWARE, UnifiedEventType.SOFTWARE_INSTALLED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.UNINSTALLED_SOFTWARE, UnifiedEventType.SOFTWARE_UNINSTALLED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.ADDED_SOFTWARE, UnifiedEventType.SOFTWARE_CREATED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.EDITED_SOFTWARE, UnifiedEventType.SOFTWARE_UPDATED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.DELETED_SOFTWARE, UnifiedEventType.SOFTWARE_DELETED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.CANCELED_INSTALL_SOFTWARE, UnifiedEventType.SOFTWARE_INSTALLATION_CANCELED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.CANCELED_UNINSTALL_SOFTWARE, UnifiedEventType.SOFTWARE_INSTALLATION_CANCELED);
        
        // VPP (Volume Purchase Program)
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.ENABLED_VPP, UnifiedEventType.CONFIGURATION_UPDATED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.DISABLED_VPP, UnifiedEventType.CONFIGURATION_UPDATED);
        
        // App Store Apps
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.ADDED_APP_STORE_APP, UnifiedEventType.SOFTWARE_CREATED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.EDITED_APP_STORE_APP, UnifiedEventType.SOFTWARE_UPDATED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.DELETED_APP_STORE_APP, UnifiedEventType.SOFTWARE_DELETED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.INSTALLED_APP_STORE_APP, UnifiedEventType.SOFTWARE_INSTALLED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.CANCELED_INSTALL_APP_STORE_APP, UnifiedEventType.SOFTWARE_INSTALLATION_CANCELED);
        
        // SCEP Proxy
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.ADDED_NDES_SCEP_PROXY, UnifiedEventType.INTEGRATION_ADDED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.EDITED_NDES_SCEP_PROXY, UnifiedEventType.INTEGRATION_UPDATED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.DELETED_NDES_SCEP_PROXY, UnifiedEventType.INTEGRATION_DELETED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.ADDED_CUSTOM_SCEP_PROXY, UnifiedEventType.INTEGRATION_ADDED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.EDITED_CUSTOM_SCEP_PROXY, UnifiedEventType.INTEGRATION_UPDATED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.DELETED_CUSTOM_SCEP_PROXY, UnifiedEventType.INTEGRATION_DELETED);
        
        // Certificate Integrations
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.ADDED_DIGICERT, UnifiedEventType.INTEGRATION_ADDED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.EDITED_DIGICERT, UnifiedEventType.INTEGRATION_UPDATED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.DELETED_DIGICERT, UnifiedEventType.INTEGRATION_DELETED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.ADDED_HYDRANT, UnifiedEventType.INTEGRATION_ADDED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.EDITED_HYDRANT, UnifiedEventType.INTEGRATION_UPDATED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.DELETED_HYDRANT, UnifiedEventType.INTEGRATION_DELETED);
        
        // Conditional Access
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.ADDED_CONDITIONAL_ACCESS_INTEGRATION_MICROSOFT, UnifiedEventType.INTEGRATION_ADDED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.DELETED_CONDITIONAL_ACCESS_INTEGRATION_MICROSOFT, UnifiedEventType.INTEGRATION_DELETED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.ENABLED_CONDITIONAL_ACCESS_AUTOMATIONS, UnifiedEventType.AUTOMATION_ENABLED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.DISABLED_CONDITIONAL_ACCESS_AUTOMATIONS, UnifiedEventType.AUTOMATION_DISABLED);
        
        // Custom Variables
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.CREATED_CUSTOM_VARIABLE, UnifiedEventType.CONFIGURATION_CREATED);
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.DELETED_CUSTOM_VARIABLE, UnifiedEventType.CONFIGURATION_DELETED);
        
        // Setup Experience
        registerMapping(IntegratedToolType.FLEET, SourceEventTypes.Fleet.EDITED_SETUP_EXPERIENCE_SOFTWARE, UnifiedEventType.CONFIGURATION_UPDATED);
    }
}
