// services/openframe-api/src/main/java/com/openframe/api/model/Event.java
package com.openframe.api.model;

import java.time.Instant;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.Data;

@Data
@Document(collection = "events")
public class Event {
    @Id
    private String id;
    private String type;
    private String payload;
    private Instant timestamp;
    private String userId;
}