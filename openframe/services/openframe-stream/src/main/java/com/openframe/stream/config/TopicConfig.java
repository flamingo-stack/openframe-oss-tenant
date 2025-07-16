package com.openframe.stream.config;

import org.springframework.context.annotation.Configuration;

/**
 * Configuration for Kafka topic names used in Fleet activities stream processing
 * Centralizes topic naming to avoid hardcoded strings throughout the application
 */
@Configuration
public class TopicConfig {

    public static final String ACTIVITIES_TOPIC = "fleet.activities.events";
    public static final String HOST_ACTIVITIES_TOPIC = "fleet.host_activities.events";
    public static final String ENRICHED_ACTIVITIES_TOPIC = "fleet.mysql.events";

    /**
     * Get the activities topic name
     */
    public String getActivitiesTopic() {
        return ACTIVITIES_TOPIC;
    }

    /**
     * Get the host activities topic name
     */
    public String getHostActivitiesTopic() {
        return HOST_ACTIVITIES_TOPIC;
    }

    /**
     * Get the enriched activities topic name (output topic)
     */
    public String getEnrichedActivitiesTopic() {
        return ENRICHED_ACTIVITIES_TOPIC;
    }
} 