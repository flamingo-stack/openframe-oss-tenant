package com.openframe.api.service;

import com.openframe.core.model.IntegratedTool;
import com.openframe.core.model.ToolFilter;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class ToolService {
    
    private final MongoTemplate mongoTemplate;

    public List<IntegratedTool> getIntegratedTools(ToolFilter filter) {
        log.debug("Getting integrated tools with filter: {}", filter);
        
        Query query = new Query();
        
        if (filter != null) {
            if (filter.getEnabled() != null) {
                query.addCriteria(Criteria.where("enabled").is(filter.getEnabled()));
            }
            
            if (filter.getType() != null) {
                query.addCriteria(Criteria.where("type").is(filter.getType()));
            }
            
            if (filter.getSearch() != null && !filter.getSearch().trim().isEmpty()) {
                Criteria searchCriteria = new Criteria().orOperator(
                    Criteria.where("name").regex(filter.getSearch(), "i"),
                    Criteria.where("description").regex(filter.getSearch(), "i")
                );
                query.addCriteria(searchCriteria);
            }
        }
        
        List<IntegratedTool> tools = mongoTemplate.find(query, IntegratedTool.class);
        log.debug("Found {} integrated tools", tools.size());
        
        return tools;
    }

    public Optional<IntegratedTool> getIntegratedToolById(String id) {
        log.debug("Getting integrated tool by ID: {}", id);
        IntegratedTool tool = mongoTemplate.findById(id, IntegratedTool.class);
        return Optional.ofNullable(tool);
    }

    public Optional<IntegratedTool> getIntegratedToolByName(String name) {
        log.debug("Getting integrated tool by name: {}", name);
        Query query = Query.query(Criteria.where("name").is(name));
        IntegratedTool tool = mongoTemplate.findOne(query, IntegratedTool.class);
        return Optional.ofNullable(tool);
    }

    public List<IntegratedTool> getEnabledTools() {
        log.debug("Getting enabled integrated tools");
        Query query = Query.query(Criteria.where("enabled").is(true));
        return mongoTemplate.find(query, IntegratedTool.class);
    }

    public IntegratedTool createIntegratedTool(IntegratedTool tool) {
        log.debug("Creating new integrated tool: {}", tool.getName());
        IntegratedTool savedTool = mongoTemplate.save(tool);
        log.info("Integrated tool created with ID: {}", savedTool.getId());
        return savedTool;
    }

    public IntegratedTool updateIntegratedTool(String id, IntegratedTool tool) {
        log.debug("Updating integrated tool with ID: {}", id);
        
        Optional<IntegratedTool> existingTool = getIntegratedToolById(id);
        if (existingTool.isEmpty()) {
            throw new RuntimeException("Integrated tool not found with id: " + id);
        }
        
        tool.setId(id);
        IntegratedTool savedTool = mongoTemplate.save(tool);
        log.info("Integrated tool updated: {}", savedTool.getId());
        
        return savedTool;
    }

    public void deleteIntegratedTool(String id) {
        log.debug("Deleting integrated tool with ID: {}", id);
        
        Optional<IntegratedTool> tool = getIntegratedToolById(id);
        if (tool.isPresent()) {
            mongoTemplate.remove(tool.get());
            log.info("Integrated tool deleted: {}", id);
        } else {
            log.warn("Attempted to delete non-existent integrated tool: {}", id);
        }
    }
} 