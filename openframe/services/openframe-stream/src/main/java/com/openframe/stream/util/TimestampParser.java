package com.openframe.stream.util;

import lombok.AccessLevel;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Optional;

/**
 * Utility class for parsing timestamps from various integrated tools.
 * Handles different timestamp formats used by PostgreSQL, MySQL, MongoDB, and other sources.
 */
@Slf4j
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class TimestampParser {
    
    // PostgreSQL TIMESTAMPTZ format: "2025-08-01 11:50:16.653094 +00:00"
    private static final DateTimeFormatter POSTGRESQL_FORMATTER = 
        DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.SSSSSS XXX");
    
    // MySQL DATETIME format: "2025-07-31 15:25:37.479046"
    private static final DateTimeFormatter MYSQL_DATETIME_FORMATTER = 
        DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.SSSSSS");
    
    
    /**
     * Parse PostgreSQL TIMESTAMPTZ format.
     * Used by Tactical RMM.
     */
    public static Optional<Long> parsePostgreSqlTimestamp(String timestamp) {
        try {
            OffsetDateTime odt = OffsetDateTime.parse(timestamp, POSTGRESQL_FORMATTER);
            return Optional.of(odt.toInstant().toEpochMilli());
        } catch (DateTimeParseException e) {
            log.warn("Failed to parse PostgreSQL TIMESTAMPTZ: {}", timestamp, e);
            return Optional.empty();
        }
    }
    
    /**
     * Parse MySQL DATETIME format (assumes UTC).
     * Used by Fleet MDM.
     */
    public static Optional<Long> parseMySqlDateTime(String timestamp) {
        try {
            LocalDateTime ldt = LocalDateTime.parse(timestamp, MYSQL_DATETIME_FORMATTER);
            return Optional.of(ldt.toInstant(ZoneOffset.UTC).toEpochMilli());
        } catch (DateTimeParseException e) {
            log.warn("Failed to parse MySQL DATETIME: {}", timestamp, e);
            return Optional.empty();
        }
    }
    
    /**
     * Parse ISO 8601 format.
     * Used by MeshCentral.
     */
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