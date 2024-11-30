package com.openframe.stream.service;

import java.util.Map;
import java.util.stream.Collectors;

import org.apache.pinot.client.Connection;
import org.springframework.stereotype.Service;

@Service
public class PinotIngestionService {

    private final Connection pinotConnection;

    public PinotIngestionService(Connection pinotConnection) {
        this.pinotConnection = pinotConnection;
    }

    public void ingestData(String tableName, Map<String, Object> data) {
        try {
            org.apache.pinot.spi.data.readers.GenericRow row = new org.apache.pinot.spi.data.readers.GenericRow();
            data.forEach(row::putField);

            pinotConnection.execute(
                    String.format("INSERT INTO %s VALUES %s",
                            tableName,
                            convertToInsertValues(data))
            );

        } catch (Exception e) {
            throw new RuntimeException("Data ingestion failed", e);
        }
    }

    private String convertToInsertValues(Map<String, Object> data) {
        return data.values().stream()
                .map(this::formatValue)
                .collect(Collectors.joining(", ", "(", ")"));
    }

    private String formatValue(Object value) {
        if (value == null) {
            return "null";
        }
        if (value instanceof String) {
            return "'" + value + "'";
        }
        return value.toString();
    }
}
