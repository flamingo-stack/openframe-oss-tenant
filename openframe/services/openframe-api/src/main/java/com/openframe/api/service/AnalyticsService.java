package com.openframe.api.service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.apache.pinot.client.Connection;
import org.apache.pinot.client.ResultSet;
import org.apache.pinot.client.ResultSetGroup;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import ch.qos.logback.classic.Logger;

@Service
public class AnalyticsService {

    private final Logger logger = (Logger) LoggerFactory.getLogger(AnalyticsService.class);
    private final Connection pinotConnection;

    public AnalyticsService(Connection pinotConnection) {
        this.pinotConnection = pinotConnection;
    }

    public List<Map<String, Object>> executeQuery(String sqlQuery) {
        try {
            ResultSetGroup resultSetGroup = pinotConnection.execute(sqlQuery);
            ResultSet resultSet = resultSetGroup.getResultSet(0);

            List<Map<String, Object>> results = new ArrayList<>();
            for (int i = 0; i < resultSet.getRowCount(); i++) {
                Map<String, Object> row = new HashMap<>();
                int columnCount = resultSet.getColumnCount();
                for (int j = 0; j < columnCount; j++) {
                    row.put(resultSet.getColumnName(j), resultSet.getString(i, j));
                }
                results.add(row);
            }
            return results;
        } catch (Exception e) {
            logger.error("Failed to execute Pinot query: {}", sqlQuery, e);
            throw new RuntimeException("Failed to execute query", e);
        }
    }
}
