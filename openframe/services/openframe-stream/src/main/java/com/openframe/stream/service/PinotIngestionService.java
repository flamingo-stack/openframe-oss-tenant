package com.openframe.stream.service;

import ch.qos.logback.classic.Logger;
import org.slf4j.LoggerFactory;
import org.apache.pinot.client.Connection;
import org.springframework.stereotype.Service;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class PinotIngestionService {
    private final Logger logger = (Logger) LoggerFactory.getLogger(PinotIngestionService.class);
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
            
            logger.info("Successfully ingested data into table: {}", tableName);
        } catch (Exception e) {
            logger.error("Failed to ingest data into table: {}", tableName, e);
            throw new RuntimeException("Data ingestion failed", e);
        }
    }

    private String convertToInsertValues(Map<String, Object> data) {
        return data.values().stream()
            .map(this::formatValue)
            .collect(Collectors.joining(", ", "(", ")"));
    }

    private String formatValue(Object value) {
        if (value == null) return "null";
        if (value instanceof String) return "'" + value + "'";
        return value.toString();
    }
}
