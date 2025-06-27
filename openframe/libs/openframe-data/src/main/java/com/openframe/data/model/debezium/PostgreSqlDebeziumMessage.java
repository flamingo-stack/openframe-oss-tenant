package com.openframe.data.model.debezium;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public abstract class PostgreSqlDebeziumMessage extends DebeziumMessage {
    
    @JsonProperty("table")
    private String table;
    
    @Override
    public String getTableName() {
        return table;
    }
} 