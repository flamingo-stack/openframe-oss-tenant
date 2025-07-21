package com.openframe.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaginationCriteria {
    private Integer page;
    private Integer pageSize;

    public static final int DEFAULT_PAGE = 1;
    public static final int DEFAULT_PAGE_SIZE = 20;
    public static final int MAX_PAGE_SIZE = 100;

    public PaginationCriteria normalize() {
        int normalizedPage = Math.max(DEFAULT_PAGE, page != null ? page : DEFAULT_PAGE);
        int normalizedPageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, pageSize != null ? pageSize : DEFAULT_PAGE_SIZE));
        return new PaginationCriteria(normalizedPage, normalizedPageSize);
    }
} 