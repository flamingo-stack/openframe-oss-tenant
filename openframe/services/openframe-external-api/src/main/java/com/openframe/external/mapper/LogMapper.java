package com.openframe.external.mapper;

import com.openframe.api.dto.audit.LogQueryResult;
import com.openframe.api.dto.audit.LogEvent;
import com.openframe.api.dto.audit.LogFilters;
import com.openframe.api.dto.audit.LogDetails;
import com.openframe.api.dto.audit.LogFilterOptions;
import com.openframe.api.dto.audit.OrganizationFilterOption;
import com.openframe.external.dto.audit.LogResponse;
import com.openframe.external.dto.audit.LogsResponse;
import com.openframe.external.dto.audit.LogFilterResponse;
import com.openframe.external.dto.audit.LogDetailsResponse;
import com.openframe.external.dto.audit.LogFilterCriteria;
import com.openframe.external.dto.audit.OrganizationFilterResponse;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
public class LogMapper extends BaseRestMapper {


    public LogResponse toLogResponse(LogEvent logEvent) {
        if (logEvent == null) {
            return null;
        }

        return LogResponse.builder()
                .toolEventId(logEvent.getToolEventId())
                .eventType(logEvent.getEventType())
                .ingestDay(logEvent.getIngestDay())
                .toolType(logEvent.getToolType())
                .severity(logEvent.getSeverity())
                .userId(logEvent.getUserId())
                .deviceId(logEvent.getDeviceId())
                .summary(logEvent.getSummary())
                .timestamp(logEvent.getTimestamp())
                .build();
    }


    public LogsResponse toLogsResponse(LogQueryResult result) {
        if (result == null) {
            return LogsResponse.builder()
                    .logs(List.of())
                    .pageInfo(null)
                    .build();
        }

        List<LogResponse> logs = result.getEvents().stream()
                .map(this::toLogResponse)
                .collect(Collectors.toList());

        return LogsResponse.builder()
                .logs(logs)
                .pageInfo(toRestPageInfo(result.getPageInfo()))
                .build();
    }

    public LogFilterResponse toLogFilterResponse(LogFilters filters) {
        if (filters == null) {
            return LogFilterResponse.builder().build();
        }

        List<OrganizationFilterResponse> organizations = filters.getOrganizations().stream()
                .map(org -> OrganizationFilterResponse.builder()
                        .id(org.getId())
                        .name(org.getName())
                        .build())
                .collect(Collectors.toList());

        return LogFilterResponse.builder()
                .toolTypes(filters.getToolTypes())
                .eventTypes(filters.getEventTypes())
                .severities(filters.getSeverities())
                .organizations(organizations)
                .build();
    }


    public LogFilterOptions toLogFilterOptions(LogFilterCriteria criteria) {
        if (criteria == null) {
            return LogFilterOptions.builder().build();
        }
        
        return LogFilterOptions.builder()
                .startDate(criteria.getStartDate())
                .endDate(criteria.getEndDate())
                .toolTypes(criteria.getToolTypes())
                .eventTypes(criteria.getEventTypes())
                .severities(criteria.getSeverities())
                .organizationIds(criteria.getOrganizationIds())
                .deviceId(criteria.getDeviceId())
                .build();
    }


    public LogDetailsResponse toLogDetailsResponse(LogDetails logDetails) {
        if (logDetails == null) {
            return null;
        }
        
        return LogDetailsResponse.builder()
                .toolEventId(logDetails.getToolEventId())
                .eventType(logDetails.getEventType())
                .ingestDay(logDetails.getIngestDay())
                .toolType(logDetails.getToolType())
                .severity(logDetails.getSeverity())
                .userId(logDetails.getUserId())
                .deviceId(logDetails.getDeviceId())
                .summary(logDetails.getSummary())
                .content(logDetails.getDetails())
                .timestamp(logDetails.getTimestamp())
                .build();
    }
}