package com.openframe.core.model;

import java.time.Instant;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.index.Indexed;
import lombok.Data;

@Data
@Document(collection = "tags")
public class Tag {
    @Id
    private String id;

    @Indexed(unique = true)
    private String name;

    private String description;
    private String color;  // Optional

    private String organizationId;  // scope tags to organizations
    private Instant createdAt;
    private String createdBy;
}
