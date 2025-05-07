package com.openframe.client.dto.client;

import lombok.Data;

@Data
public class CreateClientRequest {
    private String[] grantTypes;
    private String[] scopes;
} 