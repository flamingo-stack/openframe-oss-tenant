package com.openframe.data.repository.pinot;

import com.openframe.data.repository.pinot.exception.PinotQueryException;
import lombok.extern.slf4j.Slf4j;
import org.apache.pinot.client.*;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Repository;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Repository
public class PinotClientDeviceRepository implements PinotDeviceRepository {

    private final Connection pinotConnection;

    @Value("${pinot.devices.table:devices}")
    private String devicesTable;

    public PinotClientDeviceRepository(@Qualifier("pinotBrokerConnection") Connection pinotConnection) {
        this.pinotConnection = pinotConnection;
    }

    @Override
    public Map<String, Integer> getStatusFilterOptions(
            List<String> statuses,
            List<String> deviceTypes,
            List<String> osTypes,
            List<String> organizationIds,
            List<String> tagNames) {
        String whereClause = buildWhereClauseExcluding(statuses, deviceTypes, osTypes, organizationIds, tagNames, "status");
        return queryPinotForFilterOptions("SELECT status, COUNT(*) as count FROM " + devicesTable +
            (whereClause.isEmpty() ? "" : " WHERE " + whereClause) +
            " GROUP BY status ORDER BY count DESC");
    }

    @Override
    public Map<String, Integer> getDeviceTypeFilterOptions(
            List<String> statuses,
            List<String> deviceTypes,
            List<String> osTypes,
            List<String> organizationIds,
            List<String> tagNames) {
        String whereClause = buildWhereClauseExcluding(statuses, deviceTypes, osTypes, organizationIds, tagNames, "deviceType");
        return queryPinotForFilterOptions("SELECT deviceType, COUNT(*) as count FROM " + devicesTable +
            (whereClause.isEmpty() ? "" : " WHERE " + whereClause) +
            " GROUP BY deviceType ORDER BY count DESC");
    }

    @Override
    public Map<String, Integer> getOsTypeFilterOptions(
            List<String> statuses,
            List<String> deviceTypes,
            List<String> osTypes,
            List<String> organizationIds,
            List<String> tagNames) {
        String whereClause = buildWhereClauseExcluding(statuses, deviceTypes, osTypes, organizationIds, tagNames, "osType");
        return queryPinotForFilterOptions("SELECT osType, COUNT(*) as count FROM " + devicesTable +
            (whereClause.isEmpty() ? "" : " WHERE " + whereClause) +
            " GROUP BY osType ORDER BY count DESC");
    }

    @Override
    public Map<String, Integer> getOrganizationFilterOptions(
            List<String> statuses,
            List<String> deviceTypes,
            List<String> osTypes,
            List<String> organizationIds,
            List<String> tagNames) {
        String whereClause = buildWhereClauseExcluding(statuses, deviceTypes, osTypes, organizationIds, tagNames, "organizationId");
        return queryPinotForFilterOptions("SELECT organizationId, COUNT(*) as count FROM " + devicesTable +
            (whereClause.isEmpty() ? "" : " WHERE " + whereClause) +
            " GROUP BY organizationId ORDER BY count DESC");
    }

    @Override
    public Map<String, Integer> getTagFilterOptions(
            List<String> statuses,
            List<String> deviceTypes,
            List<String> osTypes,
            List<String> organizationIds,
            List<String> tagNames) {
        String whereClause = buildWhereClauseExcluding(statuses, deviceTypes, osTypes, organizationIds, tagNames, "tags");
        return queryPinotForFilterOptions("SELECT tags, COUNT(*) as count FROM " + devicesTable +
            (whereClause.isEmpty() ? "" : " WHERE " + whereClause) +
            " GROUP BY tags ORDER BY count DESC");
    }

    @Override
    public int getFilteredDeviceCount(
            List<String> statuses,
            List<String> deviceTypes,
            List<String> osTypes,
            List<String> organizationIds,
            List<String> tagNames) {
        String whereClause = buildWhereClause(statuses, deviceTypes, osTypes, organizationIds, tagNames);
        return queryPinotForCount("SELECT COUNT(*) FROM " + devicesTable +
            (whereClause.isEmpty() ? "" : " WHERE " + whereClause));
    }

    private Map<String, Integer> queryPinotForFilterOptions(String query) {
        try {
            log.debug("Executing Pinot query: {}", query);
            ResultSetGroup resultSetGroup = pinotConnection.execute(query);
            ResultSet resultSet = resultSetGroup.getResultSet(0);

            Map<String, Integer> options = new LinkedHashMap<>();

            for (int i = 0; i < resultSet.getRowCount(); i++) {
                String value = resultSet.getString(i, 0);
                if (value != null && !value.isEmpty()) {
                    long count = resultSet.getLong(i, 1);
                    options.put(value, (int) count);
                }
            }

            log.debug("Found {} options for query: {}", options.size(), query);
            return options;
        } catch (Exception e) {
            log.error("Unexpected error executing Pinot query: {}", query, e);
            throw new PinotQueryException("Failed to execute Pinot query: " + e.getMessage(), e);
        }
    }

    private int queryPinotForCount(String query) {
        try {
            log.debug("Executing Pinot count query: {}", query);
            ResultSetGroup resultSetGroup = pinotConnection.execute(query);
            ResultSet resultSet = resultSetGroup.getResultSet(0);

            if (resultSet.getRowCount() > 0) {
                long count = resultSet.getLong(0, 0);
                log.debug("Count result: {}", count);
                return (int) count;
            }

            return 0;
        } catch (Exception e) {
            log.error("Unexpected error executing Pinot count query: {}", query, e);
            throw new PinotQueryException("Failed to execute Pinot count query: " + e.getMessage(), e);
        }
    }

    private String buildWhereClause(List<String> statuses, List<String> deviceTypes, 
                                   List<String> osTypes, List<String> organizationIds, List<String> tagNames) {
        List<String> conditions = new ArrayList<>();

        if (statuses != null && !statuses.isEmpty()) {
            String statusCondition = statuses.stream()
                    .map(status -> "status = '" + status + "'")
                    .collect(Collectors.joining(" OR "));
            conditions.add("(" + statusCondition + ")");
        }

        if (deviceTypes != null && !deviceTypes.isEmpty()) {
            String deviceTypeCondition = deviceTypes.stream()
                    .map(type -> "deviceType = '" + type + "'")
                    .collect(Collectors.joining(" OR "));
            conditions.add("(" + deviceTypeCondition + ")");
        }

        if (osTypes != null && !osTypes.isEmpty()) {
            String osTypeCondition = osTypes.stream()
                    .map(os -> "osType = '" + os + "'")
                    .collect(Collectors.joining(" OR "));
            conditions.add("(" + osTypeCondition + ")");
        }

        if (organizationIds != null && !organizationIds.isEmpty()) {
            String orgCondition = organizationIds.stream()
                    .map(orgId -> "organizationId = '" + orgId + "'")
                    .collect(Collectors.joining(" OR "));
            conditions.add("(" + orgCondition + ")");
        }

        if (tagNames != null && !tagNames.isEmpty()) {
            String tagCondition = tagNames.stream()
                    .map(tagName -> "tags = '" + tagName + "'")
                    .collect(Collectors.joining(" OR "));
            conditions.add("(" + tagCondition + ")");
        }

        if (conditions.isEmpty()) {
            return "";
        }

        return String.join(" AND ", conditions);
    }

    private String buildWhereClauseExcluding(List<String> statuses, List<String> deviceTypes, 
                                            List<String> osTypes, List<String> organizationIds, 
                                            List<String> tagNames, String excludeField) {
        List<String> conditions = new ArrayList<>();

        if (statuses != null && !statuses.isEmpty() && !"status".equals(excludeField)) {
            String statusCondition = statuses.stream()
                    .map(status -> "status = '" + status + "'")
                    .collect(Collectors.joining(" OR "));
            conditions.add("(" + statusCondition + ")");
        }

        if (deviceTypes != null && !deviceTypes.isEmpty() && !"deviceType".equals(excludeField)) {
            String deviceTypeCondition = deviceTypes.stream()
                    .map(type -> "deviceType = '" + type + "'")
                    .collect(Collectors.joining(" OR "));
            conditions.add("(" + deviceTypeCondition + ")");
        }

        if (osTypes != null && !osTypes.isEmpty() && !"osType".equals(excludeField)) {
            String osTypeCondition = osTypes.stream()
                    .map(os -> "osType = '" + os + "'")
                    .collect(Collectors.joining(" OR "));
            conditions.add("(" + osTypeCondition + ")");
        }

        if (organizationIds != null && !organizationIds.isEmpty() && !"organizationId".equals(excludeField)) {
            String orgCondition = organizationIds.stream()
                    .map(orgId -> "organizationId = '" + orgId + "'")
                    .collect(Collectors.joining(" OR "));
            conditions.add("(" + orgCondition + ")");
        }

        if (tagNames != null && !tagNames.isEmpty() && !"tags".equals(excludeField)) {
            String tagCondition = tagNames.stream()
                    .map(tagName -> "tags = '" + tagName + "'")
                    .collect(Collectors.joining(" OR "));
            conditions.add("(" + tagCondition + ")");
        }

        if (conditions.isEmpty()) {
            return "";
        }

        return String.join(" AND ", conditions);
    }

} 