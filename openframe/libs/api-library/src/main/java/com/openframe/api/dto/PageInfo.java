package com.openframe.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PageInfo {
    private boolean hasNextPage;
    private boolean hasPreviousPage;
    private int currentPage;
    private int totalPages;
} 