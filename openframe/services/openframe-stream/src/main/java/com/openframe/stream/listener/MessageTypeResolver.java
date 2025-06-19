package com.openframe.stream.listener;

import com.openframe.stream.enumeration.MessageType;

import java.util.ArrayList;
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
            Object collection = sourceMap.get("collection");
            if (!(collection instanceof String)) {
                return null;
            }

            String collectionName = (String) collection;

            MessageType messageType = switch (collectionName) {
                case "tags" -> MessageType.OPENFRAME_MONGO_TAGS;
                case "machines" -> MessageType.OPENFRAME_MONGO_MACHINES;
                case "machineTag" -> MessageType.OPENFRAME_MONGO_MACHINE_TAG;
                default -> null;
            };
            if (messageType != null) {
                messageTypeList.add(messageType);
            }

        } catch (Exception e) {
        }
        return messageTypeList;
    }

}
