package com.openframe.api.dto.client;

import lombok.Data;

@Data
public class CreateClientRequest {
    private String[] grantTypes;
    private String[] scopes;
} 