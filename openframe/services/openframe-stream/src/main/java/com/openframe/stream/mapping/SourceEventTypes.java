package com.openframe.stream.mapping;

/**
 * Constants for source event types from integrated tools.
 * Organized by tool and event category for better maintainability.
 */
public interface SourceEventTypes {

    /**
     * MeshCentral event types
     */
    interface MeshCentral {
        
        // Server events
        String SERVER_STARTED = "server.started";
        String SERVER_STOPPED = "server.stopped";
        
        // User events
        String USER_LOGIN = "user.login";
        String USER_LOGOUT = "user.logout";
        String USER_PASSCHANGE = "user.passchange";
        String USER_ACCOUNTCREATE = "user.accountcreate";
        String USER_ACCOUNTREMOVE = "user.accountremove";
        String USER_ACCOUNTCHANGE = "user.accountchange";
        String USER_LOGIN_TOKEN_CHANGED = "user.loginTokenChanged";
        String USER_LOGIN_TOKEN_ADDED = "user.loginTokenAdded";
        String USER_UI_CUSTOM_EVENT = "user.uicustomevent";
        String USER_END_SESSION = "user.endsession";
        
        // Mesh/Group events
        String MESH_DELETE = "mesh.deletemesh";
        String MESH_CHANGE = "mesh.meshchange";
        String MESH_CREATE = "mesh.createmesh";
        
        // Node/Device events
        String NODE_ADD = "node.addnode";
        String NODE_CHANGE = "node.changenode";
        String NODE_REMOVE = "node.removenode";
        String NODE_DEVICE_SESSIONS = "node.devicesessions";
        String NODE_SYSINFO_HASH = "node.sysinfohash";
        String NODE_AMT_ACTIVATE = "node.amtactivate";
        String NODE_DIAGNOSTIC = "node.diagnostic";
        String NODE_AGENT_LOG = "node.agentlog";
        String NODE_BATCH_UPLOAD = "node.batchupload";
        String NODE_SESSION_COMPRESSION = "node.sessioncompression";
        
        // Relay events
        String RELAY_LOG = "relay.relaylog";
        String RELAY_RECORDING = "relay.recording";
        
        // User group events
        String UGRP_USERGROUP_CHANGE = "ugrp.usergroupchange";
        String UGRP_CREATE_USERGROUP = "ugrp.createusergroup";
        String UGRP_DELETE_USERGROUP = "ugrp.deleteusergroup";
        
        // Standalone events (without etype)
        String SCAN_AMT_DEVICE = "scanamtdevice";
        String SERVER_TIMELINE_STATS = "servertimelinestats";
        String WS_SESSION_COUNT = "wssessioncount";
    }

    /**
     * Tactical RMM event types
     */
    interface Tactical {
        
        // Authentication events
        String USER_LOGIN = "user.login";
        String USER_FAILED_LOGIN = "user.failed_login";
        
        // Device management events
        String AGENT_ADD = "agent.add";
        String AGENT_MODIFY = "agent.modify";
        String AGENT_DELETE = "agent.delete";
        String AGENT_INSTALL = "agent.agent_install";
        String AGENT_REMOTE_SESSION = "agent.remote_session";
        
        // User management events
        String USER_ADD = "user.add";
        String USER_MODIFY = "user.modify";
        String USER_DELETE = "user.delete";
        String ROLE_ADD = "role.add";
        String ROLE_MODIFY = "role.modify";
        
        // Script & automation events
        String SCRIPT_ADD = "scxript.add"; // Note: keeping original typo from source
        String SCRIPT_MODIFY = "script.modify";
        String AGENT_EXECUTE_SCRIPT = "agent.execute_script";
        String AGENT_EXECUTE_COMMAND = "agent.execute_command";
        String CMD_RUN_STARTED = "cmd_run.started";
        String CMD_RUN_FINISHED = "cmd_run.finished";
        String SCRIPT_EXECUTION_STARTED = "script_run.started";
        String SCRIPT_EXECUTION_FINISHED = "script_run.finished";
        String TASK_RUN_STARTED = "task_run.started";
        String TASK_RUN_FINISHED = "task_run.finished";
        String AUTOMATED_TASK_ADD = "automatedtask.add";
        String AUTOMATED_TASK_MODIFY = "automatedtask.modify";
        String AUTOMATED_TASK_RUN = "automatedtask.task_run";
        
        // Policy & compliance events
        String POLICY_ADD = "policy.add";
        String POLICY_MODIFY = "policy.modify";
        String WIN_UPDATE_POLICY_ADD = "winupdatepolicy.add";
        String WIN_UPDATE_POLICY_MODIFY = "winupdatepolicy.modify";
        
        // Monitoring events
        String CHECK_ADD = "check.add";
        String CHECK_MODIFY = "check.modify";
        String CHECK_RUN = "check.check_run";
        String ALERT_TEMPLATE_ADD = "alerttemplate.add";
        String ALERT_TEMPLATE_MODIFY = "alerttemplate.modify";
        
        // System events
        String CORE_SETTINGS_MODIFY = "coresettings.modify";
        String BULK_ACTION = "bulk.bulk_action";
        
        // Group events (clients/sites)
        String CLIENT_ADD = "client.add";
        String CLIENT_MODIFY = "client.modify";
        String CLIENT_DELETE = "client.delete";
        String SITE_ADD = "site.add";
        String SITE_MODIFY = "site.modify";
        String SITE_DELETE = "site.delete";
    }

    /**
     * Fleet MDM event types
     */
    interface Fleet {
        
        // Authentication events
        String USER_LOGGED_IN = "user_logged_in";
        String USER_FAILED_LOGIN = "user_failed_login";
        String USER_ADDED_BY_SSO = "user_added_by_sso";
        
        // User management events
        String CREATED_USER = "created_user";
        String DELETED_USER = "deleted_user";
        String CHANGED_USER_GLOBAL_ROLE = "changed_user_global_role";
        String DELETED_USER_GLOBAL_ROLE = "deleted_user_global_role";
        String CHANGED_USER_TEAM_ROLE = "changed_user_team_role";
        String DELETED_USER_TEAM_ROLE = "deleted_user_team_role";
        
        // Device enrollment events
        String FLEET_ENROLLED = "fleet_enrolled";
        String MDM_ENROLLED = "mdm_enrolled";
        String MDM_UNENROLLED = "mdm_unenrolled";
        
        // Activity Automations
        String ENABLED_ACTIVITY_AUTOMATIONS = "enabled_activity_automations";
        String EDITED_ACTIVITY_AUTOMATIONS = "edited_activity_automations";
        String DISABLED_ACTIVITY_AUTOMATIONS = "disabled_activity_automations";
        
        // Pack Management
        String CREATED_PACK = "created_pack";
        String EDITED_PACK = "edited_pack";
        String DELETED_PACK = "deleted_pack";
        String APPLIED_SPEC_PACK = "applied_spec_pack";
        
        // Policy Management
        String CREATED_POLICY = "created_policy";
        String EDITED_POLICY = "edited_policy";
        String DELETED_POLICY = "deleted_policy";
        String APPLIED_SPEC_POLICY = "applied_spec_policy";
        
        // Saved Query Management
        String CREATED_SAVED_QUERY = "created_saved_query";
        String EDITED_SAVED_QUERY = "edited_saved_query";
        String DELETED_SAVED_QUERY = "deleted_saved_query";
        String DELETED_MULTIPLE_SAVED_QUERY = "deleted_multiple_saved_query";
        String APPLIED_SPEC_SAVED_QUERY = "applied_spec_saved_query";
        
        // Team Management
        String CREATED_TEAM = "created_team";
        String DELETED_TEAM = "deleted_team";
        String APPLIED_SPEC_TEAM = "applied_spec_team";
        String TRANSFERRED_HOSTS = "transferred_hosts";
        
        // Agent Options
        String EDITED_AGENT_OPTIONS = "edited_agent_options";
        
        // Queries
        String LIVE_QUERY = "live_query";
        String EXECUTE_SCHEDULED_QUERY = "execute_scheduled_query";
        
        // OS Version Requirements
        String EDITED_MACOS_MIN_VERSION = "edited_macos_min_version";
        String EDITED_IOS_MIN_VERSION = "edited_ios_min_version";
        String EDITED_IPADOS_MIN_VERSION = "edited_ipados_min_version";
        String EDITED_WINDOWS_UPDATES = "edited_windows_updates";
        
        // Disk Encryption
        String READ_HOST_DISK_ENCRYPTION_KEY = "read_host_disk_encryption_key";
        String ENABLED_MACOS_DISK_ENCRYPTION = "enabled_macos_disk_encryption";
        String DISABLED_MACOS_DISK_ENCRYPTION = "disabled_macos_disk_encryption";
        String ESCROWED_DISK_ENCRYPTION_KEY = "escrowed_disk_encryption_key";
        
        // macOS Profiles
        String CREATED_MACOS_PROFILE = "created_macos_profile";
        String EDITED_MACOS_PROFILE = "edited_macos_profile";
        String DELETED_MACOS_PROFILE = "deleted_macos_profile";
        
        // macOS Setup Assistant
        String CHANGED_MACOS_SETUP_ASSISTANT = "changed_macos_setup_assistant";
        String DELETED_MACOS_SETUP_ASSISTANT = "deleted_macos_setup_assistant";
        String ENABLED_MACOS_SETUP_END_USER_AUTH = "enabled_macos_setup_end_user_auth";
        String DISABLED_MACOS_SETUP_END_USER_AUTH = "disabled_macos_setup_end_user_auth";
        
        // GitOps
        String ENABLED_GITOPS_MODE = "enabled_gitops_mode";
        String DISABLED_GITOPS_MODE = "disabled_gitops_mode";
        
        // Bootstrap Package
        String ADDED_BOOTSTRAP_PACKAGE = "added_bootstrap_package";
        String DELETED_BOOTSTRAP_PACKAGE = "deleted_bootstrap_package";
        
        // MDM Platform Support
        String ENABLED_WINDOWS_MDM = "enabled_windows_mdm";
        String DISABLED_WINDOWS_MDM = "disabled_windows_mdm";
        String ENABLED_ANDROID_MDM = "enabled_android_mdm";
        String DISABLED_ANDROID_MDM = "disabled_android_mdm";
        String ENABLED_WINDOWS_MDM_MIGRATION = "enabled_windows_mdm_migration";
        String DISABLED_WINDOWS_MDM_MIGRATION = "disabled_windows_mdm_migration";
        
        // Script Management
        String RAN_SCRIPT = "ran_script";
        String ADDED_SCRIPT = "added_script";
        String EDITED_SCRIPT = "edited_script";
        String UPDATED_SCRIPT = "updated_script";
        String DELETED_SCRIPT = "deleted_script";
        String CANCELED_RUN_SCRIPT = "canceled_run_script";
        String RAN_SCRIPT_BATCH = "ran_script_batch";
        String SCHEDULED_SCRIPT_BATCH = "scheduled_script_batch";
        String CANCELED_SCRIPT_BATCH = "canceled_script_batch";
        
        // Windows Profiles
        String CREATED_WINDOWS_PROFILE = "created_windows_profile";
        String EDITED_WINDOWS_PROFILE = "edited_windows_profile";
        String DELETED_WINDOWS_PROFILE = "deleted_windows_profile";
        
        // Host Actions
        String LOCKED_HOST = "locked_host";
        String UNLOCKED_HOST = "unlocked_host";
        String WIPED_HOST = "wiped_host";
        
        // Declaration Profiles
        String CREATED_DECLARATION_PROFILE = "created_declaration_profile";
        String EDITED_DECLARATION_PROFILE = "edited_declaration_profile";
        String DELETED_DECLARATION_PROFILE = "deleted_declaration_profile";
        
        // Configuration Profiles
        String RESENT_CONFIGURATION_PROFILE = "resent_configuration_profile";
        String RESENT_CONFIGURATION_PROFILE_BATCH = "resent_configuration_profile_batch";
        
        // Software Management
        String INSTALLED_SOFTWARE = "installed_software";
        String UNINSTALLED_SOFTWARE = "uninstalled_software";
        String ADDED_SOFTWARE = "added_software";
        String EDITED_SOFTWARE = "edited_software";
        String DELETED_SOFTWARE = "deleted_software";
        String CANCELED_INSTALL_SOFTWARE = "canceled_install_software";
        String CANCELED_UNINSTALL_SOFTWARE = "canceled_uninstall_software";
        
        // VPP (Volume Purchase Program)
        String ENABLED_VPP = "enabled_vpp";
        String DISABLED_VPP = "disabled_vpp";
        
        // App Store Apps
        String ADDED_APP_STORE_APP = "added_app_store_app";
        String EDITED_APP_STORE_APP = "edited_app_store_app";
        String DELETED_APP_STORE_APP = "deleted_app_store_app";
        String INSTALLED_APP_STORE_APP = "installed_app_store_app";
        String CANCELED_INSTALL_APP_STORE_APP = "canceled_install_app_store_app";
        
        // SCEP Proxy
        String ADDED_NDES_SCEP_PROXY = "added_ndes_scep_proxy";
        String EDITED_NDES_SCEP_PROXY = "edited_ndes_scep_proxy";
        String DELETED_NDES_SCEP_PROXY = "deleted_ndes_scep_proxy";
        String ADDED_CUSTOM_SCEP_PROXY = "added_custom_scep_proxy";
        String EDITED_CUSTOM_SCEP_PROXY = "edited_custom_scep_proxy";
        String DELETED_CUSTOM_SCEP_PROXY = "deleted_custom_scep_proxy";
        
        // Certificate Integrations
        String ADDED_DIGICERT = "added_digicert";
        String EDITED_DIGICERT = "edited_digicert";
        String DELETED_DIGICERT = "deleted_digicert";
        String ADDED_HYDRANT = "added_hydrant";
        String EDITED_HYDRANT = "edited_hydrant";
        String DELETED_HYDRANT = "deleted_hydrant";
        
        // Conditional Access
        String ADDED_CONDITIONAL_ACCESS_INTEGRATION_MICROSOFT = "added_conditional_access_integration_microsoft";
        String DELETED_CONDITIONAL_ACCESS_INTEGRATION_MICROSOFT = "deleted_conditional_access_integration_microsoft";
        String ENABLED_CONDITIONAL_ACCESS_AUTOMATIONS = "enabled_conditional_access_automations";
        String DISABLED_CONDITIONAL_ACCESS_AUTOMATIONS = "disabled_conditional_access_automations";
        
        // Custom Variables
        String CREATED_CUSTOM_VARIABLE = "created_custom_variable";
        String DELETED_CUSTOM_VARIABLE = "deleted_custom_variable";
        
        // Setup Experience
        String EDITED_SETUP_EXPERIENCE_SOFTWARE = "edited_setup_experience_software";
    }
}
