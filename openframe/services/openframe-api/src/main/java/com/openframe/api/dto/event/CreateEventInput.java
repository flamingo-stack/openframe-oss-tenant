package com.openframe.api.dto.event;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateEventInput {
    
    @NotNull(message = "User ID is required")
    private String userId;
    
    @NotBlank(message = "Event type is required")
    private String type;
    
    private String data;
}