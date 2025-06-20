package com.openframe.data.model.redis;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import lombok.Data;

@Data
public class RedisMachineTag {

    @JsonProperty("_id")
    private String id;

    private String machineId;
    private String tagId;

    @JsonDeserialize(using = DebeziumDateDeserializer.class)
    private String taggedAt;
    private String taggedBy;

}
