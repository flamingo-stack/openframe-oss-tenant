package com.openframe.stream.service;

import com.openframe.data.model.enums.MessageType;
import com.openframe.stream.model.fleet.Activity;
import com.openframe.stream.model.fleet.ActivityMessage;
import com.openframe.stream.model.fleet.HostActivity;
import com.openframe.stream.model.fleet.HostActivityMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.common.serialization.Serde;
import org.apache.kafka.common.serialization.Serdes;
import org.apache.kafka.streams.StreamsBuilder;
import org.apache.kafka.streams.kstream.*;
import org.apache.kafka.streams.KeyValue;
import org.apache.kafka.streams.processor.api.FixedKeyProcessor;
import org.apache.kafka.streams.processor.api.FixedKeyProcessorContext;
import org.apache.kafka.streams.processor.api.FixedKeyRecord;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.context.annotation.Bean;

import java.nio.charset.StandardCharsets;
import java.time.Duration;

import static com.openframe.kafka.enumeration.KafkaHeader.MESSAGE_TYPE_HEADER;

@Service
@RequiredArgsConstructor
@Slf4j
public class ActivityEnrichmentService {

    private final Serde<ActivityMessage> activityMessageSerde;
    private final Serde<ActivityMessage> outgoingActivityMessageSerde;
    private final Serde<HostActivityMessage> hostActivityMessageSerde;

    @Value("${openframe.oss-tenant.kafka.topics.inbound.fleet-mdm-activities}")
    private String activitiesTopic;

    @Value("${openframe.oss-tenant.kafka.topics.inbound.fleet-mdm-host-activities}")
    private String hostActivitiesTopic;

    @Value("${openframe.oss-tenant.kafka.topics.inbound.fleet-mdm-events}")
    private String enrichedActivitiesTopic;

    private static final Duration JOIN_WINDOW_DURATION = Duration.ofSeconds(5);

    @Bean
    public KStream<String, ActivityMessage> buildActivityEnrichmentStream(StreamsBuilder builder) {
        log.info("Building activity enrichment stream (Spring Kafka Streams style)");

        // Create KStreams from input topics
        KStream<String, ActivityMessage> activityStream = builder
                .stream(activitiesTopic, Consumed.with(Serdes.String(), activityMessageSerde))
                .selectKey((key, value) -> {
                    if (value == null || value.getPayload() == null || value.getPayload().getAfter() == null) {
                        return null;
                    }
                    return value.getPayload().getAfter().getId().toString();
                });

        KStream<String, HostActivityMessage> hostActivityStream = builder
                .stream(hostActivitiesTopic, Consumed.with(Serdes.String(), hostActivityMessageSerde))
                .filter((key, value) -> {
                    if (value == null || value.getPayload() == null || value.getPayload().getAfter() == null) {
                        return false;
                    }
                    HostActivity hostActivity = value.getPayload().getAfter();
                    return hostActivity.getActivityId() != null;
                })
                .map((key, value) -> {
                    HostActivity hostActivity = value.getPayload().getAfter();
                    return new KeyValue<>(hostActivity.getActivityId().toString(), value);
                });

        KStream<String, ActivityMessage> enrichedStream = activityStream
                .leftJoin(
                        hostActivityStream,
                        this::enrichActivityWithHostInfo,
                        JoinWindows.ofTimeDifferenceWithNoGrace(JOIN_WINDOW_DURATION),
                        StreamJoined.with(Serdes.String(), activityMessageSerde, hostActivityMessageSerde)
                );

        // Add constant header using modern Processor API and send to output topic
        KStream<String, ActivityMessage> withHeaderStream = enrichedStream.processValues(HeaderAdderFixedKey::new);

        withHeaderStream.to(enrichedActivitiesTopic, Produced.with(Serdes.String(), outgoingActivityMessageSerde));

        log.info("Activity enrichment stream built successfully");
        return withHeaderStream;
    }

    private ActivityMessage enrichActivityWithHostInfo(ActivityMessage activity, HostActivityMessage hostActivity) {
        if (activity == null || activity.getPayload() == null || activity.getPayload().getAfter() == null) {
            log.warn("Activity or its data is null, skipping enrichment");
            return activity;
        }
        Activity activityData = activity.getPayload().getAfter();

        if (hostActivity == null || hostActivity.getPayload() == null || hostActivity.getPayload().getAfter() == null) {
            log.debug("No HostActivity data found for activity {}", activityData.getId());
            return activity;
        }
        Integer hostId = hostActivity.getPayload().getAfter().getHostId();
        if (hostId == null) {
            log.debug("HostActivity for activity {} has null hostId", activityData.getId());
            return activity;
        }
        activityData.setHostId(hostId);
        log.debug("Set hostId {} for activity {}", hostId, activityData.getId());

        activityData.setAgentId(hostId.toString());

        return activity;
    }

    private static final class HeaderAdderFixedKey implements FixedKeyProcessor<String, ActivityMessage, ActivityMessage> {

        private FixedKeyProcessorContext<String, ActivityMessage> context;

        public void init(FixedKeyProcessorContext<String, ActivityMessage> context) {
            this.context = context;
        }

        @Override
        public void process(FixedKeyRecord<String, ActivityMessage> record) {
            record.headers().add(MESSAGE_TYPE_HEADER, MessageType.FLEET_MDM_EVENT.name().getBytes(StandardCharsets.UTF_8));
            record.headers().add("__TypeId__", "com.openframe.kafka.model.debezium.CommonDebeziumMessage".getBytes(StandardCharsets.UTF_8));
            context.forward(record);
        }

        @Override
        public void close() { /* no-op */ }
    }
} 