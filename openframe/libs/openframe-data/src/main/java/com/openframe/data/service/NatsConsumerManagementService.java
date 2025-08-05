package com.openframe.data.service;

import com.openframe.core.exception.NatsException;
import io.nats.client.Connection;
import io.nats.client.JetStreamManagement;
import io.nats.client.api.ConsumerConfiguration;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class NatsConsumerManagementService {

  private final Connection natsConnection;

  public void create(String streamName, ConsumerConfiguration consumerConfiguration) {
    try {
      JetStreamManagement jetStreamManagement = natsConnection.jetStreamManagement();
      jetStreamManagement.createConsumer(streamName, consumerConfiguration);
    } catch (Exception e) {
      throw new NatsException("Error during consumer creation", e);
    }
  }
}
