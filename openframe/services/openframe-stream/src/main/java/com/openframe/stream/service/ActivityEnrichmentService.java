package com.openframe.stream.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.openframe.stream.config.TopicConfig;
import com.openframe.stream.model.Activity;
import com.openframe.stream.model.ActivityMessage;
import com.openframe.stream.model.HostActivity;
import com.openframe.stream.model.HostActivityMessage;
import com.openframe.stream.repository.fleet.FleetHostRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.common.serialization.Serde;
import org.apache.kafka.common.serialization.Serdes;
import org.apache.kafka.streams.StreamsBuilder;
import org.apache.kafka.streams.kstream.*;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class ActivityEnrichmentService {

    private final StreamsBuilder streamsBuilder;
    private final Serde<ActivityMessage> activityMessageSerde;
    private final Serde<HostActivityMessage> hostActivityMessageSerde;
    private final FleetHostRepository fleetHostRepository;
    private final ObjectMapper objectMapper;

    public StreamsBuilder getStreamsBuilder() {
        return streamsBuilder;
    }

    private static final Duration JOIN_WINDOW_DURATION = Duration.ofSeconds(10);
    private static final DateTimeFormatter TIMESTAMP_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    public void buildStream() {
        log.info("Building activity enrichment stream");

        // Create KStreams from input topics
        KStream<String, ActivityMessage> activityStream = streamsBuilder
            .stream(TopicConfig.ACTIVITIES_TOPIC, Consumed.with(Serdes.String(), activityMessageSerde));

        KStream<String, HostActivityMessage> hostActivityStream = streamsBuilder
            .stream(TopicConfig.HOST_ACTIVITIES_TOPIC, Consumed.with(Serdes.String(), hostActivityMessageSerde));

        // Join streams on timestamp using time window
        KStream<String, ActivityMessage> enrichedStream = activityStream
            .leftJoin(
                hostActivityStream,
                this::enrichActivityWithAgentId,
                JoinWindows.ofTimeDifferenceWithNoGrace(JOIN_WINDOW_DURATION),
                Joined.with(Serdes.String(), activityMessageSerde, hostActivityMessageSerde)
            );

        // Send to output topic
        enrichedStream.to(TopicConfig.ENRICHED_ACTIVITIES_TOPIC, Produced.with(Serdes.String(), activityMessageSerde));

        log.info("Activity enrichment stream built successfully");
    }

    private ActivityMessage enrichActivityWithAgentId(ActivityMessage activity, HostActivityMessage hostActivity) {
        if (activity == null) {
            return activity;
        }

        // For now, just return the original activity
        // TODO: Implement enrichment logic when models are properly set up
        log.debug("Processing activity: {}", activity);
        
        if (hostActivity != null) {
            log.debug("Found matching host activity: {}", hostActivity);
        }

        return activity;
    }
} 