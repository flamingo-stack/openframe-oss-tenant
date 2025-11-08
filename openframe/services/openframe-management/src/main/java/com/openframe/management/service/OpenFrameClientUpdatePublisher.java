package com.openframe.management.service;

import com.openframe.data.document.clientconfiguration.OpenFrameClientConfiguration;
import com.openframe.data.mapper.DownloadConfigurationMapper;
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
    private final DownloadConfigurationMapper downloadConfigurationMapper;

    public void publish(OpenFrameClientConfiguration configuration) {
        OpenFrameClientUpdateMessage message = buildMessage(configuration);
        natsMessagePublisher.publish(TOPIC_NAME, message);
        log.info("Published client update message for all machines with version: {}", configuration.getVersion());
    }

    private OpenFrameClientUpdateMessage buildMessage(OpenFrameClientConfiguration configuration) {
        OpenFrameClientUpdateMessage message = new OpenFrameClientUpdateMessage();
        message.setVersion(configuration.getVersion());
        message.setDownloadConfigurations(downloadConfigurationMapper.map(configuration.getDownloadConfiguration()));
        return message;
    }
}
