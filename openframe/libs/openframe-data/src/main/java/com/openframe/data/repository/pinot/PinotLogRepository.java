package com.openframe.data.repository.pinot;

import com.openframe.data.document.event.LogProjection;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface PinotLogRepository {

    List<LogProjection> findLogs(
            LocalDate startDate,
            LocalDate endDate,
            List<String> toolTypes,
            List<String> eventTypes,
            List<String> severities,
            String cursor,
            int limit
    );

    List<LogProjection> searchLogs(
            LocalDate startDate,
            LocalDate endDate,
            List<String> toolTypes,
            List<String> eventTypes,
            List<String> severities,
            String searchTerm,
            String cursor,
            int limit
    );

    List<String> getToolTypeOptions(
            LocalDate startDate,
            LocalDate endDate,
            List<String> toolTypes,
            List<String> eventTypes,
            List<String> severities
    );

    List<String> getEventTypeOptions(
            LocalDate startDate,
            LocalDate endDate,
            List<String> toolTypes,
            List<String> eventTypes,
            List<String> severities
    );

    List<String> getSeverityOptions(
            LocalDate startDate,
            LocalDate endDate,
            List<String> toolTypes,
            List<String> eventTypes,
            List<String> severities
    );

    List<String> getAvailableDateRanges(
            List<String> toolTypes,
            List<String> eventTypes,
            List<String> severities
    );
} 