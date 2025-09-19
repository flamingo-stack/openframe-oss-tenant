package com.openframe.data.dto.response;

import lombok.Data;

@Data
public class RegistrationResponse {
    private String id;
    private String name;
    private String domain;
    private String openFrameUrl;
    private String ownerId;
    private String status;
    private String plan;
    private String createdAt;
    private String updatedAt;
    private Boolean active;
}

