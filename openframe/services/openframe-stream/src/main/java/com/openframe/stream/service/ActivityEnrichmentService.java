package com.openframe.stream.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.openframe.stream.model.fleet.Activity;
import com.openframe.stream.model.fleet.ActivityMessage;
import com.openframe.stream.model.fleet.HostActivity;
import com.openframe.stream.model.fleet.HostActivityMessage;
import com.openframe.stream.repository.fleet.FleetHostRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.common.serialization.Serde;
import org.apache.kafka.common.serialization.Serdes;
import org.apache.kafka.streams.StreamsBuilder;
import org.apache.kafka.streams.kstream.*;
import org.apache.kafka.streams.KeyValue;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
@Slf4j
public class ActivityEnrichmentService {

    private final StreamsBuilder streamsBuilder;
    private final Serde<ActivityMessage> activityMessageSerde;
    private final Serde<HostActivityMessage> hostActivityMessageSerde;
    private final FleetHostRepository fleetHostRepository;
    private final HostAgentCacheService hostAgentCacheService;
    private final ObjectMapper objectMapper;

    @Value("${kafka.topics.activities:fleet.activities.events}")
    private String activitiesTopic;

    @Value("${kafka.topics.host-activities:fleet.host_activities.events}")
    private String hostActivitiesTopic;

    @Value("${kafka.topics.enriched-activities:fleet.mysql.events}")
    private String enrichedActivitiesTopic;

    public StreamsBuilder getStreamsBuilder() {
        return streamsBuilder;
    }

    private static final Duration JOIN_WINDOW_DURATION = Duration.ofSeconds(10);
    private static final DateTimeFormatter TIMESTAMP_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    public void buildStream() {
        log.info("Building activity enrichment stream");

        // Create KStreams from input topics
        KStream<String, ActivityMessage> activityStream = streamsBuilder
            .stream(activitiesTopic, Consumed.with(Serdes.String(), activityMessageSerde));

        KStream<String, HostActivityMessage> hostActivityStream = streamsBuilder
            .stream(hostActivitiesTopic, Consumed.with(Serdes.String(), hostActivityMessageSerde));

        // Transform HostActivity stream to use activity_id as key for join
        KStream<String, HostActivityMessage> hostActivityStreamByActivityId = hostActivityStream
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

        // Join streams: Activity (left) with HostActivity (right) on activity_id
        KStream<String, ActivityMessage> enrichedStream = activityStream
            .leftJoin(
                hostActivityStreamByActivityId,
                this::enrichActivityWithHostInfo,
                JoinWindows.ofTimeDifferenceWithNoGrace(JOIN_WINDOW_DURATION),
                StreamJoined.with(Serdes.String(), activityMessageSerde, hostActivityMessageSerde)
            );

        // Send to output topic
        enrichedStream.to(enrichedActivitiesTopic, Produced.with(Serdes.String(), activityMessageSerde));

        log.info("Activity enrichment stream built successfully");
    }

    private ActivityMessage enrichActivityWithHostInfo(ActivityMessage activity, HostActivityMessage hostActivity) {
        if (activity == null) {
            return activity;
        }

        try {
            Activity activityData = activity.getPayload().getAfter();
            if (activityData == null) {
                log.warn("Activity data is null, skipping enrichment");
                return activity;
            }

            // If we have HostActivity data, extract host_id
            if (hostActivity != null && hostActivity.getPayload() != null && hostActivity.getPayload().getAfter() != null) {
                HostActivity hostActivityData = hostActivity.getPayload().getAfter();
                Long hostId = hostActivityData.getHostId();
                
                if (hostId != null) {
                    activityData.setHostId(hostId);
                    log.debug("Set hostId {} for activity {}", hostId, activityData.getId());
                    
                    // Try to get agentId from cache or database
                    String agentId = hostAgentCacheService.getAgentId(hostId);
                    if (agentId != null) {
                        activityData.setAgentId(agentId);
                        log.debug("Enriched activity {} with agentId: {}", activityData.getId(), agentId);
                    } else {
                        log.warn("Could not find agentId for hostId: {}", hostId);
                    }
                }
            } else {
                log.debug("No HostActivity data found for activity {}", activityData.getId());
            }

        } catch (Exception e) {
            log.error("Error enriching activity: {}", e.getMessage(), e);
        }

        return activity;
    }
} 