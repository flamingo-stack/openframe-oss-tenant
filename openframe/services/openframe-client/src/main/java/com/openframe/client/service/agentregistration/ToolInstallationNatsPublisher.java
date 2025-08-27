package com.openframe.client.service.agentregistration;

import com.openframe.core.model.IntegratedToolAgent;
import com.openframe.data.model.nats.ToolInstallationMessage;
import com.openframe.data.repository.nats.NatsMessagePublisher;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import static java.lang.String.format;

@Component
@RequiredArgsConstructor
public class ToolInstallationNatsPublisher {

    private final static String TOPIC_NAME_TEMPLATE = "machine.%s.tool-installation";

    private final NatsMessagePublisher natsMessagePublisher;

    public void publish(String machineId, IntegratedToolAgent toolAgent) {
        String topicName = buildTopicName(machineId);
        ToolInstallationMessage message = buildMessage(toolAgent);
        natsMessagePublisher.publish(topicName, message);
    }

    private String buildTopicName(String machineId) {
        return format(TOPIC_NAME_TEMPLATE, machineId);
    }

    private ToolInstallationMessage buildMessage(IntegratedToolAgent toolAgent) {
        ToolInstallationMessage message = new ToolInstallationMessage();
        message.setToolId(toolAgent.getId());
        message.setVersion(toolAgent.getVersion());
        message.setInstallationCommandArgs(toolAgent.getInstallationCommandArgs());
        message.setRunCommandArgs(toolAgent.getRunCommandArgs());
        message.setAssets(toolAgent.getAssets());
        return message;
    }

}
