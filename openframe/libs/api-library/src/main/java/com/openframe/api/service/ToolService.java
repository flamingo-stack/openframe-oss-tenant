package com.openframe.api.service;

import com.openframe.core.model.IntegratedTool;
import com.openframe.core.model.ToolFilter;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;
import lombok.RequiredArgsConstructor;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ToolService {
    
    private final MongoTemplate mongoTemplate;

    public List<IntegratedTool> getIntegratedTools(ToolFilter filter) {
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

            if (filter.getSearch() != null) {
                Criteria searchCriteria = new Criteria().orOperator(
                    Criteria.where("name").regex(filter.getSearch(), "i"),
                    Criteria.where("description").regex(filter.getSearch(), "i")
                );
                query.addCriteria(searchCriteria);
            }
        }
        
        return mongoTemplate.find(query, IntegratedTool.class);
    }
} 