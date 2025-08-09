package com.openframe.stream.util;

import lombok.AccessLevel;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.Optional;

/**
 * Utility class for parsing timestamps from integrated tools via Debezium CDC.
 * Debezium converts all database timestamps to ISO 8601 format.
 */
@Slf4j
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class TimestampParser {

    public static Optional<Long> parseIso8601(String timestamp) {
        try {
            Instant instant = Instant.parse(timestamp);
            return Optional.of(instant.toEpochMilli());
        } catch (DateTimeParseException e) {
            log.warn("Failed to parse ISO 8601 timestamp: {}", timestamp, e);
            return Optional.empty();
        }
    }
}