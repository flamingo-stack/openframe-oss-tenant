package com.openframe.management.service;

import com.openframe.data.model.nats.ToolAgentUpdateMessage;
import com.openframe.data.repository.nats.NatsMessagePublisher;
import com.openframe.data.document.toolagent.IntegratedToolAgent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import static java.lang.String.format;

@Service
@RequiredArgsConstructor
@Slf4j
public class ToolAgentUpdatePublisher {

    private final static String TOPIC_NAME_TEMPLATE = "machine.all.tool-update";

    private final NatsMessagePublisher natsMessagePublisher;

    public void publish(IntegratedToolAgent toolAgent) {
        ToolAgentUpdateMessage message = buildMessage(toolAgent);
        natsMessagePublisher.publish(TOPIC_NAME_TEMPLATE, message);
        log.info("Published tool update message for tool: {} version: {}", toolAgent.getId(), toolAgent.getVersion());
    }

    private ToolAgentUpdateMessage buildMessage(IntegratedToolAgent toolAgent) {
        ToolAgentUpdateMessage message = new ToolAgentUpdateMessage();
        message.setToolAgentId(toolAgent.getId());
        message.setVersion(toolAgent.getVersion());
        return message;
    }
}
