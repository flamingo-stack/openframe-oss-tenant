package com.openframe.data.model.debezium;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public abstract class MongoDbDebeziumMessage extends DebeziumMessage {

    @JsonProperty("collection")
    private String collection;

    @Override
    public String getTableName() {
        return collection;
    }

}