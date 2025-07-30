package com.openframe.data.repository.mongo;

import com.openframe.core.model.Event;
import com.openframe.core.model.event.filter.EventQueryFilter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.time.LocalTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Repository
@RequiredArgsConstructor
@Slf4j
public class CustomEventRepositoryImpl implements CustomEventRepository {
    
    private final MongoTemplate mongoTemplate;

    @Override
    public Query buildEventQuery(EventQueryFilter filter, String search) {
        Query query = new Query();
        
        if (filter != null) {
            if (filter.getUserIds() != null && !filter.getUserIds().isEmpty()) {
                query.addCriteria(Criteria.where("userId").in(filter.getUserIds()));
            }
            
            if (filter.getEventTypes() != null && !filter.getEventTypes().isEmpty()) {
                query.addCriteria(Criteria.where("type").in(filter.getEventTypes()));
            }
            
            if (filter.getStartDate() != null || filter.getEndDate() != null) {
                Criteria dateCriteria = Criteria.where("timestamp");
                
                if (filter.getStartDate() != null) {
                    Instant startInstant = filter.getStartDate()
                            .atTime(LocalTime.MIN)
                            .toInstant(ZoneOffset.UTC);
                    dateCriteria.gte(startInstant);
                }
                
                if (filter.getEndDate() != null) {
                    Instant endInstant = filter.getEndDate()
                            .atTime(LocalTime.MAX)
                            .toInstant(ZoneOffset.UTC);
                    dateCriteria.lte(endInstant);
                }
                
                query.addCriteria(dateCriteria);
            }
        }
        
        if (search != null && !search.trim().isEmpty()) {
            Criteria searchCriteria = new Criteria().orOperator(
                    Criteria.where("type").regex(search, "i"),
                    Criteria.where("data").regex(search, "i")
            );
            query.addCriteria(searchCriteria);
        }
        
        return query;
    }

    @Override
    public List<Event> findEventsWithCursor(Query query, String cursor, int limit) {
        if (cursor != null && !cursor.trim().isEmpty()) {
            query.addCriteria(Criteria.where("_id").gt(cursor));
        }
        
        query.with(Sort.by(Sort.Direction.ASC, "_id"));
        query.limit(limit);
        
        return mongoTemplate.find(query, Event.class);
    }

    @Override
    public List<String> findDistinctUserIds() {
        return mongoTemplate.findDistinct(new Query(), "userId", Event.class, String.class)
                .stream()
                .filter(Objects::nonNull)
                .sorted()
                .collect(Collectors.toList());
    }

    @Override
    public List<String> findDistinctEventTypes() {
        return mongoTemplate.findDistinct(new Query(), "type", Event.class, String.class)
                .stream()
                .filter(Objects::nonNull)
                .sorted()
                .collect(Collectors.toList());
    }
}