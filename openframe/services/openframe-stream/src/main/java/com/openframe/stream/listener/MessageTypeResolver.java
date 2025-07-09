package com.openframe.stream.listener;

import com.openframe.data.model.enums.MessageType;
import com.openframe.data.model.enums.IntegratedToolType;

import java.util.Map;

public class MessageTypeResolver {

    public static MessageType resolve(Map<String, Object> message) {
        try {
            Object payload = message.get("payload");
            if (!(payload instanceof Map)) {
                return null;
            }

            Map<String, Object> payloadMap = (Map<String, Object>) payload;
            Object source = payloadMap.get("source");
            if (!(source instanceof Map)) {
                return null;
            }

            Map<String, Object> sourceMap = (Map<String, Object>) source;
            
            // Get database name
            Object database = sourceMap.get("db");
            if (!(database instanceof String databaseName)) {
                return null;
            }

            // Determine integrated tool based on database name
            return (databaseName.equals(IntegratedToolType.MESHCENTRAL.getDbName()))
                    ? MessageType.MESHCENTRAL_EVENT
                    : databaseName.equals(IntegratedToolType.TACTICAL.getDbName()) ? MessageType.TACTICAL_EVENT
                    : null;

        } catch (Exception e) {
            return null;
        }
    }

}
