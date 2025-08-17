package com.openframe.data.repository.mongo;

import com.openframe.core.model.IntegratedTool;
import com.openframe.core.model.tool.filter.ToolQueryFilter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Repository
@RequiredArgsConstructor
@Slf4j
public class CustomIntegratedToolRepositoryImpl implements CustomIntegratedToolRepository {
    
    private final MongoTemplate mongoTemplate;

    @Override
    public Query buildToolQuery(ToolQueryFilter filter, String search) {
        Query query = new Query();
        
        if (filter != null) {
            if (filter.getEnabled() != null) {
                query.addCriteria(Criteria.where("enabled").is(filter.getEnabled()));
            }
            
            if (filter.getType() != null) {
                query.addCriteria(Criteria.where("type").is(filter.getType()));
            }
            
            if (filter.getCategory() != null) {
                query.addCriteria(Criteria.where("category").is(filter.getCategory()));
            }
            
            if (filter.getPlatformCategory() != null) {
                query.addCriteria(Criteria.where("platformCategory").is(filter.getPlatformCategory()));
            }
        }
        
        if (search != null && !search.trim().isEmpty()) {
            Criteria searchCriteria = new Criteria().orOperator(
                    Criteria.where("name").regex(search, "i"),
                    Criteria.where("description").regex(search, "i")
            );
            query.addCriteria(searchCriteria);
        }
        
        return query;
    }

    @Override
    public List<IntegratedTool> findToolsWithFilters(ToolQueryFilter filter, String search) {
        Query query = buildToolQuery(filter, search);
        return mongoTemplate.find(query, IntegratedTool.class);
    }

    @Override
    public List<String> findDistinctTypes() {
        return mongoTemplate.findDistinct(new Query(), "type", IntegratedTool.class, String.class)
                .stream()
                .filter(Objects::nonNull)
                .sorted()
                .collect(Collectors.toList());
    }

    @Override
    public List<String> findDistinctCategories() {
        return mongoTemplate.findDistinct(new Query(), "category", IntegratedTool.class, String.class)
                .stream()
                .filter(Objects::nonNull)
                .sorted()
                .collect(Collectors.toList());
    }

    @Override
    public List<String> findDistinctPlatformCategories() {
        return mongoTemplate.findDistinct(new Query(), "platformCategory", IntegratedTool.class, String.class)
                .stream()
                .filter(Objects::nonNull)
                .sorted()
                .collect(Collectors.toList());
    }
}