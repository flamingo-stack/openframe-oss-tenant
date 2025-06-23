package com.openframe.stream.listener;

import com.openframe.data.model.debezium.DebeziumMessage;
import com.openframe.stream.enumeration.MessageType;
import com.openframe.stream.enumeration.IntegratedTool;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

public class MessageTypeResolver {

    public static List<MessageType> resolve(Map<String, Object> message) {
        List<MessageType> messageTypeList = new ArrayList<>();
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
            
            // Get database type from connector
            Object connector = sourceMap.get("connector");
            if (!(connector instanceof String)) {
                return null;
            }
            
            String connectorStr = ((String) connector).toLowerCase();

            DebeziumMessage.DatabaseType sourceDb = switch (connectorStr) {
                case "mongodb" -> DebeziumMessage.DatabaseType.MONGODB;
                case "postgresql" -> DebeziumMessage.DatabaseType.POSTGRESQL;
                case "mysql" -> DebeziumMessage.DatabaseType.MYSQL;
                default -> null;
            };
            
            if (sourceDb == null) {
                return null;
            }
            
            // Get database name
            Object database = sourceMap.get("db");
            if (!(database instanceof String)) {
                return null;
            }
            
            String databaseName = (String) database;
            
            // Determine integrated tool based on database name
            IntegratedTool integratedTool = (databaseName.equals(IntegratedTool.MESHCENTRAL.getDbName()))
                    ? IntegratedTool.MESHCENTRAL
                    : databaseName.equals(IntegratedTool.TACTICAL.getDbName()) ? IntegratedTool.TACTICAL
                    : null;
            if (integratedTool == null) {
                return null;
            }
            
            // Find matching MessageType based on sourceDb and integratedTool
            messageTypeList = Arrays.stream(MessageType.values())
                    .filter(messageType -> messageType.getSourceDb() == sourceDb &&
                            messageType.getIntegratedTool() == integratedTool)
                    .toList();

        } catch (Exception e) {
            // Log exception if needed
        }
        return messageTypeList;
    }

}
