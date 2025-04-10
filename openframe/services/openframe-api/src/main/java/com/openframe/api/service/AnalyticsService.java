package com.openframe.api.service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.apache.pinot.client.Connection;
import org.apache.pinot.client.ResultSet;
import org.apache.pinot.client.ResultSetGroup;
import org.springframework.stereotype.Service;

@Service
public class AnalyticsService {
    
    private final Connection pinotControllerConnection;

    public AnalyticsService(Connection pinotControllerConnection) {
        this.pinotControllerConnection = pinotControllerConnection;
    }

    public List<Map<String, Object>> executeQuery(String sqlQuery) {
        try {
                ResultSetGroup resultSetGroup = pinotControllerConnection.execute(sqlQuery);
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
            throw new RuntimeException("Failed to execute query", e);
        }
    }
}
