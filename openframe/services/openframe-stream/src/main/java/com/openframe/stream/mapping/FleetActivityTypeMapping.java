package com.openframe.stream.mapping;

import java.util.Map;
import java.util.Optional;
import java.util.HashMap;

/**
 * Mapping between Fleet MDM activity types and their human-readable messages.
 * Based on Fleet MDM activity types documentation.
 */
public final class FleetActivityTypeMapping {
    
    private FleetActivityTypeMapping() {
        // Utility class
    }
    
    /**
     * Map of Fleet MDM activity types to human-readable messages
     */
    public static final Map<String, String> ACTIVITY_TYPE_MESSAGES = createActivityTypeMessages();
    
    private static Map<String, String> createActivityTypeMessages() {
        Map<String, String> messages = new HashMap<>();
        
        // Activity Automations
        messages.put("enabled_activity_automations", "Enabled activity automations");
        messages.put("edited_activity_automations", "Edited activity automations");
        messages.put("disabled_activity_automations", "Disabled activity automations");
        
        // Pack Management
        messages.put("created_pack", "Created pack");
        messages.put("edited_pack", "Edited pack");
        messages.put("deleted_pack", "Deleted pack");
        messages.put("applied_spec_pack", "Applied pack spec");
        
        // Policy Management
        messages.put("created_policy", "Created policy");
        messages.put("edited_policy", "Edited policy");
        messages.put("deleted_policy", "Deleted policy");
        messages.put("applied_spec_policy", "Applied policy spec");
        
        // Saved Query Management
        messages.put("created_saved_query", "Created saved query");
        messages.put("edited_saved_query", "Edited saved query");
        messages.put("deleted_saved_query", "Deleted saved query");
        messages.put("deleted_multiple_saved_query", "Deleted multiple saved queries");
        messages.put("applied_spec_saved_query", "Applied saved query spec");
        
        // Team Management
        messages.put("created_team", "Created team");
        messages.put("deleted_team", "Deleted team");
        messages.put("applied_spec_team", "Applied team spec");
        messages.put("transferred_hosts", "Transferred hosts to team");
        
        // Agent Options
        messages.put("edited_agent_options", "Edited agent options");
        
        // Queries
        messages.put("live_query", "Ran live query");
        
        // User Management
        messages.put("user_added_by_sso", "User added by SSO");
        messages.put("user_logged_in", "User logged in");
        messages.put("user_failed_login", "User failed login");
        messages.put("created_user", "Created user");
        messages.put("deleted_user", "Deleted user");
        messages.put("changed_user_global_role", "Changed user's global role");
        messages.put("deleted_user_global_role", "Deleted user's global role");
        messages.put("changed_user_team_role", "Changed user's team role");
        messages.put("deleted_user_team_role", "Deleted user's team role");
        
        // Device Enrollment
        messages.put("fleet_enrolled", "Enrolled into Fleet");
        messages.put("mdm_enrolled", "Device enrolled to MDM");
        messages.put("mdm_unenrolled", "Device unenrolled from MDM");
        
        // OS Version Requirements
        messages.put("edited_macos_min_version", "Edited macOS minimum version");
        messages.put("edited_ios_min_version", "Edited iOS minimum version");
        messages.put("edited_ipados_min_version", "Edited iPadOS minimum version");
        messages.put("edited_windows_updates", "Edited Windows updates settings");
        
        // Disk Encryption
        messages.put("read_host_disk_encryption_key", "Read host disk encryption key");
        messages.put("enabled_macos_disk_encryption", "Enabled macOS disk encryption");
        messages.put("disabled_macos_disk_encryption", "Disabled macOS disk encryption");
        messages.put("escrowed_disk_encryption_key", "Escrowed disk encryption key");
        
        // macOS Profiles
        messages.put("created_macos_profile", "Created macOS profile");
        messages.put("edited_macos_profile", "Edited macOS profile");
        messages.put("deleted_macos_profile", "Deleted macOS profile");
        
        // macOS Setup Assistant
        messages.put("changed_macos_setup_assistant", "Changed macOS Setup Assistant");
        messages.put("deleted_macos_setup_assistant", "Deleted macOS Setup Assistant");
        messages.put("enabled_macos_setup_end_user_auth", "Enabled macOS setup end-user auth");
        messages.put("disabled_macos_setup_end_user_auth", "Disabled macOS setup end-user auth");
        
        // GitOps
        messages.put("enabled_gitops_mode", "Enabled GitOps mode");
        messages.put("disabled_gitops_mode", "Disabled GitOps mode");
        
        // Bootstrap Package
        messages.put("added_bootstrap_package", "Added bootstrap package");
        messages.put("deleted_bootstrap_package", "Deleted bootstrap package");
        
        // MDM Platform Support
        messages.put("enabled_windows_mdm", "Enabled Windows MDM");
        messages.put("disabled_windows_mdm", "Disabled Windows MDM");
        messages.put("enabled_android_mdm", "Enabled Android MDM");
        messages.put("disabled_android_mdm", "Disabled Android MDM");
        messages.put("enabled_windows_mdm_migration", "Enabled Windows MDM migration");
        messages.put("disabled_windows_mdm_migration", "Disabled Windows MDM migration");
        
        // Script Management
        messages.put("ran_script", "Ran script");
        messages.put("added_script", "Added script");
        messages.put("edited_script", "Edited script");
        messages.put("updated_script", "Updated script");
        messages.put("deleted_script", "Deleted script");
        messages.put("canceled_run_script", "Canceled script run");
        messages.put("ran_script_batch", "Ran script batch");
        messages.put("scheduled_script_batch", "Scheduled script batch");
        messages.put("canceled_script_batch", "Canceled script batch");
        
        // Windows Profiles
        messages.put("created_windows_profile", "Created Windows profile");
        messages.put("edited_windows_profile", "Edited Windows profile");
        messages.put("deleted_windows_profile", "Deleted Windows profile");
        
        // Host Actions
        messages.put("locked_host", "Locked host");
        messages.put("unlocked_host", "Unlocked host");
        messages.put("wiped_host", "Wiped host");
        
        // Declaration Profiles
        messages.put("created_declaration_profile", "Created declaration profile");
        messages.put("edited_declaration_profile", "Edited declaration profile");
        messages.put("deleted_declaration_profile", "Deleted declaration profile");
        
        // Configuration Profiles
        messages.put("resent_configuration_profile", "Resent configuration profile");
        messages.put("resent_configuration_profile_batch", "Resent configuration profiles (batch)");
        
        // Software Management
        messages.put("installed_software", "Installed software");
        messages.put("uninstalled_software", "Uninstalled software");
        messages.put("added_software", "Added software");
        messages.put("edited_software", "Edited software");
        messages.put("deleted_software", "Deleted software");
        messages.put("canceled_install_software", "Canceled software installation");
        messages.put("canceled_uninstall_software", "Canceled software uninstallation");
        
        // VPP (Volume Purchase Program)
        messages.put("enabled_vpp", "Enabled VPP");
        messages.put("disabled_vpp", "Disabled VPP");
        
        // App Store Apps
        messages.put("added_app_store_app", "Added App Store app");
        messages.put("edited_app_store_app", "Edited App Store app");
        messages.put("deleted_app_store_app", "Deleted App Store app");
        messages.put("installed_app_store_app", "Installed App Store app");
        messages.put("canceled_install_app_store_app", "Canceled App Store app installation");
        
        // SCEP Proxy
        messages.put("added_ndes_scep_proxy", "Added NDES SCEP proxy");
        messages.put("edited_ndes_scep_proxy", "Edited NDES SCEP proxy");
        messages.put("deleted_ndes_scep_proxy", "Deleted NDES SCEP proxy");
        messages.put("added_custom_scep_proxy", "Added custom SCEP proxy");
        messages.put("edited_custom_scep_proxy", "Edited custom SCEP proxy");
        messages.put("deleted_custom_scep_proxy", "Deleted custom SCEP proxy");
        
        // Certificate Integrations
        messages.put("added_digicert", "Added DigiCert integration");
        messages.put("edited_digicert", "Edited DigiCert integration");
        messages.put("deleted_digicert", "Deleted DigiCert integration");
        messages.put("added_hydrant", "Added Hydrant integration");
        messages.put("edited_hydrant", "Edited Hydrant integration");
        messages.put("deleted_hydrant", "Deleted Hydrant integration");
        
        // Conditional Access
        messages.put("added_conditional_access_integration_microsoft", "Added Microsoft conditional access integration");
        messages.put("deleted_conditional_access_integration_microsoft", "Deleted Microsoft conditional access integration");
        messages.put("enabled_conditional_access_automations", "Enabled conditional access automations");
        messages.put("disabled_conditional_access_automations", "Disabled conditional access automations");
        
        // Custom Variables
        messages.put("created_custom_variable", "Created custom variable");
        messages.put("deleted_custom_variable", "Deleted custom variable");
        
        // Setup Experience
        messages.put("edited_setup_experience_software", "Edited setup experience software");
        
        return messages;
    }
    
    /**
     * Get human-readable message for Fleet MDM activity type
     * 
     * @param activityType Fleet MDM activity type
     * @return Human-readable message wrapped in Optional, empty if activity type is not found
     */
    public static Optional<String> getMessage(String activityType) {
        return Optional.ofNullable(ACTIVITY_TYPE_MESSAGES.get(activityType));
    }
    
    /**
     * Check if activity type is supported
     * 
     * @param activityType Fleet MDM activity type
     * @return true if activity type is supported, false otherwise
     */
    public static boolean isSupported(String activityType) {
        return ACTIVITY_TYPE_MESSAGES.containsKey(activityType);
    }
}
