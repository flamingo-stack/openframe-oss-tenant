package com.openframe.data.model;

import java.time.Instant;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.Data;

@Data
@Document(collection = "integrated_tool_tokens")
public class IntegratedToolToken {
    @Id
    private String id;
    private IntegratedToolType toolType;
    private String token;
    private boolean active;
    private Instant createdAt;
    private Instant expiresAt;
} 