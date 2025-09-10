package com.openframe.data.repository.pinot;

import com.openframe.data.document.event.LogProjection;
import com.openframe.data.repository.pinot.exception.PinotQueryException;
import lombok.extern.slf4j.Slf4j;
import org.apache.pinot.client.Connection;
import org.apache.pinot.client.ResultSet;
import org.apache.pinot.client.ResultSetGroup;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

@Slf4j
@Repository
public class PinotClientLogRepository implements PinotLogRepository {

    private final Connection pinotConnection;

    @Value("${pinot.logs.table:logs}")
    private String logsTable;

    public PinotClientLogRepository(@Qualifier("pinotBrokerConnection") Connection pinotConnection) {
        this.pinotConnection = pinotConnection;
    }

    @Override
    public List<LogProjection> findLogs(LocalDate startDate, LocalDate endDate, List<String> toolTypes, List<String> eventTypes,
                                        List<String> severities, String cursor, int limit) {
        PinotQueryBuilder queryBuilder = new PinotQueryBuilder(logsTable)
            .select("toolEventId", "ingestDay", "toolType", "eventType", "severity", "userId", "deviceId", "summary", "eventTimestamp")
            .whereDateRange("eventTimestamp", startDate, endDate)
            .whereIn("toolType", toolTypes)
            .whereIn("eventType", eventTypes)
            .whereIn("severity", severities)
            .whereCursor(cursor)
            .orderByTimestampDesc()
            .limit(limit);

        return executeLogQuery(queryBuilder.build());
    }

    @Override
    public List<LogProjection> searchLogs(LocalDate startDate, LocalDate endDate, List<String> toolTypes, List<String> eventTypes, 
                                    List<String> severities, String searchTerm, String cursor, int limit) {
        PinotQueryBuilder queryBuilder = new PinotQueryBuilder(logsTable)
            .select("toolEventId", "ingestDay", "toolType", "eventType", "severity", "userId", "deviceId", "summary", "eventTimestamp")
            .whereDateRange("eventTimestamp", startDate, endDate)
            .whereIn("toolType", toolTypes)
            .whereIn("eventType", eventTypes)
            .whereIn("severity", severities)
            .whereRelevanceLogSearch(searchTerm)
            .whereCursor(cursor)
            .orderByTimestampDesc()
            .limit(limit);

        return executeLogQuery(queryBuilder.build());
    }

    @Override
    public List<String> getEventTypeOptions(LocalDate startDate, LocalDate endDate, List<String> toolTypes, List<String> eventTypes, List<String> severities) {
        PinotQueryBuilder queryBuilder = new PinotQueryBuilder(logsTable)
            .select("eventType")
            .distinct()
            .whereDateRange("eventTimestamp", startDate, endDate)
            .whereIn("toolType", toolTypes)
            .whereIn("severity", severities)
            .orderBy("eventType");

        return queryPinotForFilterOptions(queryBuilder.build());
    }

    @Override
    public List<String> getSeverityOptions(LocalDate startDate, LocalDate endDate, List<String> toolTypes, List<String> eventTypes, List<String> severities) {
        PinotQueryBuilder queryBuilder = new PinotQueryBuilder(logsTable)
            .select("severity")
            .distinct()
            .whereDateRange("eventTimestamp", startDate, endDate)
            .whereIn("toolType", toolTypes)
            .whereIn("eventType", eventTypes)
            .orderBy("severity");

        return queryPinotForFilterOptions(queryBuilder.build());
    }

    @Override
    public List<String> getToolTypeOptions(LocalDate startDate, LocalDate endDate, List<String> toolTypes, List<String> eventTypes, List<String> severities) {
        PinotQueryBuilder queryBuilder = new PinotQueryBuilder(logsTable)
            .select("toolType")
            .distinct()
            .whereDateRange("eventTimestamp", startDate, endDate)
            .whereIn("eventType", eventTypes)
            .whereIn("severity", severities)
            .orderBy("toolType");

        return queryPinotForFilterOptions(queryBuilder.build());
    }

    @Override
    public List<String> getAvailableDateRanges(List<String> toolTypes, List<String> eventTypes, List<String> severities) {
        PinotQueryBuilder queryBuilder = new PinotQueryBuilder(logsTable)
            .select("ingestDay")
            .distinct()
            .whereIn("toolType", toolTypes)
            .whereIn("eventType", eventTypes)
            .whereIn("severity", severities)
            .orderBy("ingestDay");

        return queryPinotForFilterOptions(queryBuilder.build());
    }

    private List<LogProjection> executeLogQuery(String query) {
        return executeQuery(query, resultSet -> {
            Map<String, Integer> columnIndexMap = buildColumnIndexMap(resultSet);
            
            return rowIndex -> {
                LogProjection projection = new LogProjection();
                projection.toolEventId = resultSet.getString(rowIndex, columnIndexMap.get("toolEventId"));
                projection.ingestDay = resultSet.getString(rowIndex, columnIndexMap.get("ingestDay"));
                projection.toolType = resultSet.getString(rowIndex, columnIndexMap.get("toolType"));
                projection.eventType = resultSet.getString(rowIndex, columnIndexMap.get("eventType"));
                projection.severity = resultSet.getString(rowIndex, columnIndexMap.get("severity"));
                projection.userId = resultSet.getString(rowIndex, columnIndexMap.get("userId"));
                projection.deviceId = resultSet.getString(rowIndex, columnIndexMap.get("deviceId"));
                projection.summary = resultSet.getString(rowIndex, columnIndexMap.get("summary"));
                projection.eventTimestamp = Instant.ofEpochMilli(resultSet.getLong(rowIndex, columnIndexMap.get("eventTimestamp")));
                return projection;
            };
        });
    }

    private List<String> queryPinotForFilterOptions(String query) {
        return executeQuery(query, resultSet -> rowIndex -> {
            String value = resultSet.getString(rowIndex, PinotQueryBuilder.FIRST_COLUMN_INDEX);
            return (value != null && !value.isEmpty()) ? value : null;
        }).stream()
        .filter(Objects::nonNull)
        .collect(Collectors.toList());
    }

    private Map<String, Integer> buildColumnIndexMap(ResultSet resultSet) {
        Map<String, Integer> columnIndexMap = new HashMap<>();
        for (int i = 0; i < resultSet.getColumnCount(); i++) {
            columnIndexMap.put(resultSet.getColumnName(i), i);
        }
        return columnIndexMap;
    }

    private <T> List<T> executeQuery(String query, Function<ResultSet, Function<Integer, T>> mapper) {
        try {
            log.debug("Executing query: {}", query);
            ResultSetGroup resultSetGroup = pinotConnection.execute(query);
            ResultSet resultSet = resultSetGroup.getResultSet(PinotQueryBuilder.FIRST_RESULT_SET_INDEX);

            return IntStream.range(0, resultSet.getRowCount())
                    .mapToObj(i -> mapper.apply(resultSet).apply(i))
                    .collect(Collectors.toList());
        } catch (Exception e) {
            log.error("Error executing query: {}", query, e);
            throw new PinotQueryException("Failed to execute query: " + e.getMessage(), e);
        }
    }
} 