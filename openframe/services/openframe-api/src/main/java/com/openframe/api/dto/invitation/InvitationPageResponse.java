package com.openframe.api.dto.invitation;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class InvitationPageResponse {
    private List<InvitationResponse> items;
    private int page;
    private int size;
    private long totalElements;
    private int totalPages;
    private boolean hasNext;
}


