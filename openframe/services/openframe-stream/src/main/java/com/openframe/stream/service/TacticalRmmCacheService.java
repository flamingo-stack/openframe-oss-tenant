package com.openframe.stream.service;

import com.openframe.data.document.tool.IntegratedTool;
import com.openframe.data.document.tool.ToolUrl;
import com.openframe.data.document.tool.ToolUrlType;
import com.openframe.data.service.IntegratedToolService;
import com.openframe.data.service.ToolUrlService;
import com.openframe.sdk.tacticalrmm.TacticalRmmClient;
import com.openframe.sdk.tacticalrmm.model.AgentListItem;
import com.openframe.sdk.tacticalrmm.model.ScriptListItem;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

import static com.openframe.data.document.tool.IntegratedToolId.TACTICAL_SERVER_ID;

/**
 * Service for Tactical RMM cache operations using Spring Cache abstraction
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TacticalRmmCacheService {

    private TacticalRmmClient tacticalRmmClient;

    private final IntegratedToolService integratedToolService;

    private final ToolUrlService toolUrlService;

    private String baseUrl;

    private String tacticalApiKey;

    /**
     * Get agent ID from cache or Tactical RMM API by primary key
     * 
     * @param primaryKey the primary key (pk) from agents_agent table
     * @return the agent_id, or null if not found
     */
    @Cacheable(value = "agentIdCache", key = "#primaryKey", unless = "#result == null")
    public String getAgentIdByPrimaryKey(Integer primaryKey) {
        log.debug("Fetching agent ID for primary key: {}", primaryKey);
        try {
            // First attempt with cached data
            List<AgentListItem> agents = getAllAgentsFromCache();
            if (agents == null) {
                return null;
            }
            
            String agentId = findAgentIdByPrimaryKey(agents, primaryKey);
            
            // If not found, try refreshing cache and search again
            if (agentId == null) {
                log.debug("Agent not found in cache for PK: {}, refreshing cache", primaryKey);
                evictAllAgentsCache();
                agents = getAllAgentsFromCache();
                if (agents != null) {
                    agentId = findAgentIdByPrimaryKey(agents, primaryKey);
                    if (agentId != null) {
                        log.info("Agent found after cache refresh: PK={}, agent_id={}", primaryKey, agentId);
                    }
                }
            }
            
            return agentId;
                    
        } catch (Exception e) {
            log.error("Error fetching agent ID for primary key: {}", primaryKey, e);
            return null;
        }
    }

    /**
     * Get script name from cache or Tactical RMM API by script ID
     * 
     * @param scriptId the script ID
     * @return the script name, or null if not found
     */
    @Cacheable(value = "scriptNameCache", key = "#scriptId", unless = "#result == null")
    public String getScriptNameById(Integer scriptId) {
        log.debug("Fetching script name for script ID: {}", scriptId);
        try {
            TacticalRmmClient client = getTacticalRmmClient();
            if (client == null || tacticalApiKey == null) {
                log.warn("TacticalRmmClient is not available");
                return null;
            }
             
            ScriptListItem script = client.getScript(baseUrl, tacticalApiKey, scriptId.toString());
            return script != null ? script.getName() : null;
                    
        } catch (Exception e) {
            log.error("Error fetching script name for script ID: {}", scriptId, e);
            return null;
        }
    }

    /**
     * Get all agents from cache or Tactical RMM API
     * 
     * @return List of all agents, or null if not available
     */
    @Cacheable(value = "allAgentsCache", unless = "#result == null or #result.isEmpty()")
    public List<AgentListItem> getAllAgentsFromCache() {
        log.debug("Fetching all agents from Tactical RMM");
        try {
            TacticalRmmClient client = getTacticalRmmClient();
            if (client == null || tacticalApiKey == null) {
                log.warn("TacticalRmmClient is not available");
                return null;
            }
             
            return client.getAllAgents(baseUrl, tacticalApiKey);
                    
        } catch (Exception e) {
            log.error("Error fetching all agents", e);
            return null;
        }
    }

    /**
     * Evict all agents cache to force refresh on next request
     */
    @CacheEvict(value = "allAgentsCache", allEntries = true)
    public void evictAllAgentsCache() {
        log.debug("Evicting all agents cache");
    }

    /**
     * Find agent ID by primary key from the list of agents
     * 
     * @param agents list of agents
     * @param primaryKey the primary key to search for
     * @return the agent_id, or null if not found
     */
    private String findAgentIdByPrimaryKey(List<AgentListItem> agents, Integer primaryKey) {
        return agents.stream()
                .filter(agent -> primaryKey.equals(agent.getPk()))
                .map(AgentListItem::getAgentId)
                .findFirst()
                .orElse(null);
    }

    private TacticalRmmClient getTacticalRmmClient() {
        if (tacticalRmmClient == null) {
            Optional<IntegratedTool> optionalTool = integratedToolService.getToolById(TACTICAL_SERVER_ID.getValue());
            log.info("TacticalRmmClient is null, tool info: {}", optionalTool.map(IntegratedTool::getCredentials).orElse(null));

            if (optionalTool.isPresent()) {
                ToolUrl toolUrl = toolUrlService.getUrlByToolType(optionalTool.get(), ToolUrlType.API)
                        .orElseThrow(() -> new IllegalStateException("Found no api url for tool with id" + TACTICAL_SERVER_ID));

                this.tacticalRmmClient = new TacticalRmmClient();
                this.tacticalApiKey = optionalTool.get().getCredentials().getApiKey().getKey();
                this.baseUrl = toolUrl.getUrl() + ":" + toolUrl.getPort();
            }
        }
        return tacticalRmmClient;
    }
}
