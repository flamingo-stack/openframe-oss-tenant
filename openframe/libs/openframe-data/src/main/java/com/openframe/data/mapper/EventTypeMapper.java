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
        // MeshCentral mappings
        registerMapping(IntegratedToolType.MESHCENTRAL, "user.login", UnifiedEventType.LOGIN);
        registerMapping(IntegratedToolType.MESHCENTRAL, "user.logout", UnifiedEventType.LOGOUT);
        registerMapping(IntegratedToolType.MESHCENTRAL, "device.connect", UnifiedEventType.DEVICE_ONLINE);
        registerMapping(IntegratedToolType.MESHCENTRAL, "device.disconnect", UnifiedEventType.DEVICE_OFFLINE);
        registerMapping(IntegratedToolType.MESHCENTRAL, "file.transfer", UnifiedEventType.FILE_TRANSFER);
        registerMapping(IntegratedToolType.MESHCENTRAL, "remote.session.start", UnifiedEventType.REMOTE_SESSION_START);
        registerMapping(IntegratedToolType.MESHCENTRAL, "remote.session.end", UnifiedEventType.REMOTE_SESSION_END);

        // Tactical RMM mappings
        registerMapping(IntegratedToolType.TACTICAL, "user_login", UnifiedEventType.LOGIN);
        registerMapping(IntegratedToolType.TACTICAL, "user_logout", UnifiedEventType.LOGOUT);
        registerMapping(IntegratedToolType.TACTICAL, "agent_created", UnifiedEventType.DEVICE_REGISTERED);
        registerMapping(IntegratedToolType.TACTICAL, "agent_updated", UnifiedEventType.DEVICE_UPDATED);
        registerMapping(IntegratedToolType.TACTICAL, "script_executed", UnifiedEventType.SCRIPT_EXECUTED);
        registerMapping(IntegratedToolType.TACTICAL, "check_created", UnifiedEventType.MONITORING_CHECK_CREATED);
        registerMapping(IntegratedToolType.TACTICAL, "alert_triggered", UnifiedEventType.ALERT_TRIGGERED);

        // Fleet MDM mappings
        registerMapping(IntegratedToolType.FLEET, "user_login", UnifiedEventType.LOGIN);
        registerMapping(IntegratedToolType.FLEET, "user_logout", UnifiedEventType.LOGOUT);
        registerMapping(IntegratedToolType.FLEET, "host_enrolled", UnifiedEventType.DEVICE_REGISTERED);
        registerMapping(IntegratedToolType.FLEET, "host_updated", UnifiedEventType.DEVICE_UPDATED);
        registerMapping(IntegratedToolType.FLEET, "policy_applied", UnifiedEventType.POLICY_APPLIED);
        registerMapping(IntegratedToolType.FLEET, "profile_installed", UnifiedEventType.POLICY_APPLIED);
        registerMapping(IntegratedToolType.FLEET, "query_executed", UnifiedEventType.SCRIPT_EXECUTED);
    }
}
