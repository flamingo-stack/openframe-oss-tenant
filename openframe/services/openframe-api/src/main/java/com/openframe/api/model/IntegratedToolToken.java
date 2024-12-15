package com.openframe.api.model;

import java.time.Instant;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "integrated_tool_tokens")
@CompoundIndex(name = "tool_active_idx", def = "{'toolType': 1, 'active': 1}")
public class IntegratedToolToken {
    @Id
    private String id;
    
    @Indexed
    private IntegratedToolType toolType;
    
    private String token;
    private Instant createdAt;
    private boolean active;
    private String metadata; // Optional JSON string for tool-specific metadata

    public IntegratedToolToken() {
        this.createdAt = Instant.now();
        this.active = true;
    }

    public IntegratedToolToken(IntegratedToolType toolType, String token) {
        this();
        this.toolType = toolType;
        this.token = token;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public IntegratedToolType getToolType() {
        return toolType;
    }

    public void setToolType(IntegratedToolType toolType) {
        this.toolType = toolType;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    public String getMetadata() {
        return metadata;
    }

    public void setMetadata(String metadata) {
        this.metadata = metadata;
    }
} 