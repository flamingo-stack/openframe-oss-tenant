package com.openframe.api.dto.event;

import com.openframe.api.dto.shared.CursorPageInfo;
import com.openframe.data.document.event.Event;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EventQueryResult {
    private List<Event> events;
    private CursorPageInfo pageInfo;
}