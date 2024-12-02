package com.openframe.stream.service;

import java.util.Map;
import java.util.stream.Collectors;

import org.apache.pinot.client.Connection;
import org.apache.pinot.spi.data.readers.GenericRow;
import org.springframework.stereotype.Service;

@Service
public class PinotIngestionService {

    private final Connection pinotBrokerConnection;

    public PinotIngestionService(Connection pinotBrokerConnection) {
        this.pinotBrokerConnection = pinotBrokerConnection;
    }

    public void ingestData(String tableName, Map<String, Object> data) {
        try {
            GenericRow row = new GenericRow();
            data.forEach(row::putField);

            pinotBrokerConnection.execute(
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
