package com.openframe.api.util;

import com.openframe.api.dto.device.PaginationInput;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

public class PaginationUtils {
    public static final int DEFAULT_PAGE = 1;
    public static final int DEFAULT_PAGE_SIZE = 20;
    public static final int MAX_PAGE_SIZE = 100;

    public static PageRequest createPageRequest(int page, int pageSize, String sortField) {
        int normalizedPage = Math.max(DEFAULT_PAGE, page);
        int normalizedPageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, pageSize));
        return PageRequest.of(normalizedPage - 1, normalizedPageSize, Sort.by(sortField).ascending());
    }

    public static PageRequest createPageRequestFromInput(PaginationInput pagination, String sortField) {
        if (pagination == null) {
            return createPageRequest(DEFAULT_PAGE, DEFAULT_PAGE_SIZE, sortField);
        }
        return createPageRequest(
            pagination.getPage() != null ? pagination.getPage() : DEFAULT_PAGE,
            pagination.getPageSize() != null ? pagination.getPageSize() : DEFAULT_PAGE_SIZE,
            sortField
        );
    }

    public static PaginationInput normalizePagination(PaginationInput pagination) {
        if (pagination == null) {
            return PaginationInput.builder()
                    .page(DEFAULT_PAGE)
                    .pageSize(DEFAULT_PAGE_SIZE)
                    .build();
        }
        int page = Math.max(DEFAULT_PAGE, pagination.getPage() != null ? pagination.getPage() : DEFAULT_PAGE);
        int pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, pagination.getPageSize() != null ? pagination.getPageSize() : DEFAULT_PAGE_SIZE));
        return PaginationInput.builder()
                .page(page)
                .pageSize(pageSize)
                .build();
    }
} 