package com.openframe.data.dto.device;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Tag {
    private String id;
    private String name;
    private String description;
    private String color;
    private String organizationId;
    private String createdAt;
    private String createdBy;
}
