package com.openframe.data.model.redis;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import lombok.Data;

@Data
public class RedisTag {
    @JsonProperty("_id")
    private String id;

    private String name;

    private String description;
    private String color;  // Optional

    private String organizationId;  // scope tags to organizations
    @JsonDeserialize(using = DebeziumDateDeserializer.class)
    private String createdAt;
    private String createdBy;
}
