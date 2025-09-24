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
        
        // User management events
        String CREATED_USER = "created_user";
        String DELETED_USER = "deleted_user";
        String EDITED_USER = "edited_user";
        String CHANGED_USER_GLOBAL_ROLE = "changed_user_global_role";
        
        // Device management events
        String FLEET_ENROLLED = "fleet_enrolled";
        String DELETED_HOST = "deleted_host";
        String CHANGED_HOST_STATUS = "changed_host_status";
        
        // Policy events
        String POLICY_VIOLATION = "policy_violation";
        String APPLIED_POLICY = "applied_policy";
        String POLICY_COMPLIANCE_CHECKED = "policy_compliance_checked";
        
        // Remote session events
        String REMOTE_SESSION_START = "remote_session_start";
        String REMOTE_SESSION_END = "remote_session_end";
        
        // Alerting events
        String ALERT_TRIGGERED = "alert_triggered";
        String ALERT_RESOLVED = "alert_resolved";
    }
}
