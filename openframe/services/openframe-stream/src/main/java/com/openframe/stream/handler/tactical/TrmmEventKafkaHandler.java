package com.openframe.stream.handler.tactical;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.openframe.data.model.debezium.IntegratedToolEnrichedData;
import com.openframe.data.model.debezium.PostgreSqlDebeziumMessage;
import com.openframe.data.model.kafka.KafkaITPinotMessage;
import com.openframe.stream.enumeration.IntegratedTool;
import com.openframe.stream.enumeration.MessageType;
import com.openframe.stream.handler.DebeziumKafkaMessageHandler;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class TrmmEventKafkaHandler extends DebeziumKafkaMessageHandler<KafkaITPinotMessage, PostgreSqlDebeziumMessage> {

    @Value("${kafka.producer.topic.it.event.name}")
    private String topic;

    public TrmmEventKafkaHandler(KafkaTemplate<String, Object> kafkaTemplate, ObjectMapper objectMapper) {
        super(kafkaTemplate, objectMapper);
    }

    @Override
    protected String getTopic() {
        return topic;
    }

    @Override
    public MessageType getType() {
        return MessageType.TACTICAL_EVENT;
    }

    @Override
    protected KafkaITPinotMessage transform(PostgreSqlDebeziumMessage debeziumMessage, IntegratedToolEnrichedData enrichedData) {
        KafkaITPinotMessage message = new KafkaITPinotMessage();
        try {
            message.setTimestamp(debeziumMessage.getTimestamp());
            message.setToolName(IntegratedTool.TACTICAL.getDbName());
            message.setAgentId(debeziumMessage.getAgentId());
            message.setMachineId(enrichedData.getMachineId());

        } catch (Exception e) {
            log.error("Error processing Kafka message", e);
            throw e;
        }
        return message;
    }
}
