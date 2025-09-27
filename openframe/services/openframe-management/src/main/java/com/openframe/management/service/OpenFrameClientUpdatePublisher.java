package com.openframe.management.service;

import com.openframe.data.model.nats.OpenFrameClientUpdateMessage;
import com.openframe.data.repository.nats.NatsMessagePublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class OpenFrameClientUpdatePublisher {

    private final static String TOPIC_NAME = "machine.all.client-update";

    private final NatsMessagePublisher natsMessagePublisher;

    public void publish(String version) {
        OpenFrameClientUpdateMessage message = buildMessage(version);
        natsMessagePublisher.publish(TOPIC_NAME, message);
        log.info("Published client update message for all machines with version: {}", version);
    }

    private OpenFrameClientUpdateMessage buildMessage(String version) {
        OpenFrameClientUpdateMessage message = new OpenFrameClientUpdateMessage();
        message.setVersion(version);
        return message;
    }
}
