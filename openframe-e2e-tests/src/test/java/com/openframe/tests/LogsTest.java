package com.openframe.tests;

import com.openframe.data.dto.log.LogDetails;
import com.openframe.data.dto.log.LogEvent;
import com.openframe.data.dto.log.LogFilters;
import com.openframe.tests.base.AuthorizedTest;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.List;

import static com.openframe.api.LogsApi.*;
import static com.openframe.data.generator.LogGenerator.severityAndToolFilter;
import static org.assertj.core.api.Assertions.assertThat;

@Disabled("Tests disabled - waiting for devices")
@Tag("authorized")
@DisplayName("Logs")
public class LogsTest extends AuthorizedTest {

    @Test
    @DisplayName("Get log filters")
    public void testGetLogFilters() {
        LogFilters filters = getLogFilters();
        assertThat(filters).isNotNull();
        assertThat(filters.getToolTypes()).as("Expected at least one tool type").isNotEmpty();
        assertThat(filters.getEventTypes()).as("Expected at least one event type").isNotEmpty();
        assertThat(filters.getSeverities()).as("Expected at least one severity").isNotEmpty();
    }

    @Test
    @DisplayName("List logs")
    public void testListLogs() {
        List<LogEvent> logs = getLogs();
        assertThat(logs).as("Expected at least one log").isNotEmpty();
        assertThat(logs).allSatisfy(log -> {
            assertThat(log.getToolEventId()).isNotNull();
            assertThat(log.getEventType()).isNotEmpty();
            assertThat(log.getToolType()).isNotEmpty();
            assertThat(log.getTimestamp()).isNotEmpty();
            assertThat(log.getIngestDay()).isNotEmpty();
            assertThat(log.getHostname()).isNotEmpty();
        });
    }

    @Test
    @DisplayName("Get log details")
    public void testGetLogDetails() {
        List<LogEvent> logs = getLogs();
        assertThat(logs).as("Expected at least one log to get details").isNotEmpty();
        LogEvent logEvent = logs.getFirst();
        LogDetails details = getLogDetails(logEvent);
        assertThat(details).isNotNull();
        assertThat(details.getToolEventId()).isEqualTo(logEvent.getToolEventId());
        assertThat(details.getEventType()).isEqualTo(logEvent.getEventType());
        assertThat(details.getToolType()).isEqualTo(logEvent.getToolType());
    }

    @Test
    @DisplayName("Search logs")
    public void testSearchLogs() {
        List<LogEvent> logs = getLogs();
        assertThat(logs).as("Expected at least one log for search test").isNotEmpty();
        String searchTerm = logs.getFirst().getToolType();
        List<LogEvent> searchResults = searchLogs(searchTerm);
        assertThat(searchResults).as("Expected at least one search result").isNotEmpty();
        assertThat(searchResults).allSatisfy(log ->
                assertThat(log.getToolType()).isEqualTo(searchTerm)
        );
    }

    @Test
    @DisplayName("Filter logs by severity and tool")
    public void testFilterLogs() {
        LogFilters filters = getLogFilters();
        assertThat(filters.getSeverities()).as("Expected at least one severity").isNotEmpty();
        assertThat(filters.getToolTypes()).as("Expected at least one tool type").isNotEmpty();
        String severity = filters.getSeverities().getFirst();
        String toolType = filters.getToolTypes().getFirst();
        List<LogEvent> logs = getLogs(severityAndToolFilter(severity, toolType));
        assertThat(logs).as("Expected logs for severity: %s and tool: %s", severity, toolType).isNotEmpty();
        assertThat(logs).allSatisfy(log -> {
            assertThat(log.getSeverity()).isEqualTo(severity);
            assertThat(log.getToolType()).isEqualTo(toolType);
        });
    }
}
