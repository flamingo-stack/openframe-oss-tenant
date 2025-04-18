package com.openframe.api.datafetcher;

import java.util.List;

import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;

import com.netflix.graphql.dgs.DgsComponent;
import com.netflix.graphql.dgs.DgsQuery;
import com.netflix.graphql.dgs.InputArgument;
import com.openframe.core.model.ToolFilter;
import com.openframe.core.model.IntegratedTool;

import lombok.RequiredArgsConstructor;

@DgsComponent
@RequiredArgsConstructor
public class ToolsDataFetcher {
    
    private final MongoTemplate mongoTemplate;
    
    @DgsQuery
    public List<IntegratedTool> integratedTools(@InputArgument ToolFilter filter) {
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