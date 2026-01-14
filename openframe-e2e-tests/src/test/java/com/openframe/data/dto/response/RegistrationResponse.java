package com.openframe.data.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RegistrationResponse {
    private String id;
    private String name;
    private String domain;
    private String ownerId;
    private String status;
    private String plan;
    private String hubspotId;
    private String createdAt;
    private String updatedAt;
    private Boolean active;
}