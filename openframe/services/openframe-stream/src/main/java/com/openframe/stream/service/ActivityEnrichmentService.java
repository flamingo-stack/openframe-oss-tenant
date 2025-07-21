package com.openframe.stream.service;

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
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.context.annotation.Bean;

import java.time.Duration;

@Service
@RequiredArgsConstructor
@Slf4j
public class ActivityEnrichmentService {

    private final Serde<ActivityMessage> activityMessageSerde;
    private final Serde<HostActivityMessage> hostActivityMessageSerde;
    private final HostAgentCacheService hostAgentCacheService;

    @Value("${kafka.topics.activities:fleet.activities.events}")
    private String activitiesTopic;

    @Value("${kafka.topics.host-activities:fleet.host_activities.events}")
    private String hostActivitiesTopic;

    @Value("${kafka.topics.enriched-activities:fleet.mysql.events}")
    private String enrichedActivitiesTopic;

    private static final Duration JOIN_WINDOW_DURATION = Duration.ofSeconds(20);

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

        // Send to output topic
        enrichedStream.to(enrichedActivitiesTopic, Produced.with(Serdes.String(), activityMessageSerde));

        log.info("Activity enrichment stream built successfully");
        return enrichedStream;
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

        activityData.setAgentId(hostAgentCacheService.getAgentId(hostId));

        return activity;
    }
} 