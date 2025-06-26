package com.openframe.data.model.mongo;

import java.time.Instant;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.Data;

@Data
@Document(collection = "agent_registration_secrets")
public class AgentRegistrationSecret {

    @Id
    private String id;

    @Indexed(unique = true)
    private String secretKey;

    private Instant createdAt;

    private boolean active;

}