package com.openframe.api.dto.shared;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CursorPaginationCriteria {

    private Integer limit;
    private String cursor;

    public static final int DEFAULT_PAGE_SIZE = 20;
    public static final int MIN_PAGE_SIZE = 1;
    public static final int MAX_PAGE_SIZE = 100;
    

    public CursorPaginationCriteria normalize() {
        int requestedLimit = limit != null ? limit : DEFAULT_PAGE_SIZE;
        int normalizedLimit = Math.min(Math.max(MIN_PAGE_SIZE, requestedLimit), MAX_PAGE_SIZE);
        
        return CursorPaginationCriteria.builder()
                .limit(normalizedLimit)
                .cursor(cursor)
                .build();
    }

    public boolean hasCursor() {
        return cursor != null && !cursor.trim().isEmpty();
    }

}