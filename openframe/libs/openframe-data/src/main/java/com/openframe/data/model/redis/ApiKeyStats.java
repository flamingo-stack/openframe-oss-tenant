package com.openframe.data.model.redis;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.redis.core.RedisHash;
import org.springframework.data.redis.core.TimeToLive;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@RedisHash(value = "api_key_stats")
public class ApiKeyStats {

    @Id
    private String id;

    private Long totalRequests;
    private Long successfulRequests;
    private Long failedRequests;
    private LocalDateTime lastUsed;

    @TimeToLive
    private Long ttl;

    public void incrementTotal() {
        this.totalRequests = (this.totalRequests != null ? this.totalRequests : 0) + 1;
    }

    public void incrementSuccessful() {
        incrementTotal();
        this.successfulRequests = (this.successfulRequests != null ? this.successfulRequests : 0) + 1;
        this.lastUsed = LocalDateTime.now();
    }

    public void incrementFailed() {
        incrementTotal();
        this.failedRequests = (this.failedRequests != null ? this.failedRequests : 0) + 1;
        this.lastUsed = LocalDateTime.now();
    }
} 