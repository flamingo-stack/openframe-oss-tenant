package com.openframe.stream.handler;

import com.openframe.stream.enumeration.MessageType;

import java.util.Map;

public interface MessageHandler {

    MessageType getType();

    void handle(Map<String, Object> message);

}
