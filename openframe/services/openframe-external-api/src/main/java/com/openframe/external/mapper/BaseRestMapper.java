package com.openframe.external.mapper;

import com.openframe.api.dto.shared.CursorPageInfo;
import com.openframe.api.dto.shared.CursorPaginationCriteria;
import com.openframe.external.dto.shared.PageInfo;
import com.openframe.external.dto.shared.PaginationCriteria;

public abstract class BaseRestMapper {


    protected PageInfo toRestPageInfo(CursorPageInfo cursorPageInfo) {
        if (cursorPageInfo == null) {
            return null;
        }
        
        return PageInfo.builder()
                .nextCursor(cursorPageInfo.getEndCursor())
                .previousCursor(cursorPageInfo.getStartCursor())
                .hasNext(cursorPageInfo.isHasNextPage())
                .hasPrevious(cursorPageInfo.isHasPreviousPage())
                .build();
    }

    public CursorPaginationCriteria toCursorPaginationCriteria(PaginationCriteria criteria) {
        if (criteria == null) {
            return CursorPaginationCriteria.builder().build();
        }
        
        return CursorPaginationCriteria.builder()
                .cursor(criteria.getCursor())
                .limit(criteria.getLimit())
                .build();
    }
}