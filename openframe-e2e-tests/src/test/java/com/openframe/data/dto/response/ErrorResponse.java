package com.openframe.data.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Error response DTO based on actual API response structure
 * Observed structure: {"code":"BAD_REQUEST","message":"Registration is closed for this organization"}
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ErrorResponse {
    
    /**
     * Error code (e.g., "BAD_REQUEST", "VALIDATION_ERROR")
     */
    private String code;
    
    /**
     * Error message description
     */
    private String message;
}