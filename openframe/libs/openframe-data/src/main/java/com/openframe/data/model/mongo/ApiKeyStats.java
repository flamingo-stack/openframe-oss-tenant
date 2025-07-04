package com.openframe.data.model.mongo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "api_key_stats")
public class ApiKeyStats {

    @Id
    private String id;

    private Long totalRequests;
    private Long successfulRequests;
    private Long failedRequests;
    private LocalDateTime lastUsed;
} 