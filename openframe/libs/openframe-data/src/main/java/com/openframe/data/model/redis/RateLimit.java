package com.openframe.data.model.redis;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.redis.core.RedisHash;
import org.springframework.data.redis.core.TimeToLive;
import org.springframework.data.redis.core.index.Indexed;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@RedisHash(value = "rate_limit")
public class RateLimit {

    @Id
    private String id; // keyId:window:timestamp format

    @Indexed
    private String keyId;

    @Indexed
    private String window; // MINUTE, HOUR, DAY

    @Indexed
    private String timestamp; // Window identifier (yyyy-MM-dd-HH-mm, yyyy-MM-dd-HH, yyyy-MM-dd)

    private Long requestCount;
    private LocalDateTime firstRequest;
    private LocalDateTime lastRequest;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @TimeToLive
    private Long ttl;

    public static String buildId(String keyId, String window, String timestamp) {
        return String.format("%s:%s:%s", keyId, window, timestamp);
    }

    public void incrementRequest() {
        LocalDateTime now = LocalDateTime.now();

        if (this.requestCount == null) {
            this.requestCount = 1L;
            this.firstRequest = now;
            this.createdAt = now;
        } else {
            this.requestCount++;
        }

        this.lastRequest = now;
        this.updatedAt = now;
    }

    public void initializeIfNull() {
        if (this.requestCount == null) this.requestCount = 0L;
        if (this.createdAt == null) this.createdAt = LocalDateTime.now();
        if (this.updatedAt == null) this.updatedAt = LocalDateTime.now();
    }
} 