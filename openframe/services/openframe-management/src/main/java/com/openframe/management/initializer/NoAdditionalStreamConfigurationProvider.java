package com.openframe.management.initializer;

import io.nats.client.api.StreamConfiguration;
import org.springframework.stereotype.Component;

import java.util.List;

// This distribution has no AI chat, so it needs no JetStream streams beyond the ones NatsStreamConfigurationInitializer creates itself.
@Component
public class NoAdditionalStreamConfigurationProvider implements AdditionalStreamConfigurationProvider {

    @Override
    public List<StreamConfiguration> provide() {
        return List.of();
    }
}
