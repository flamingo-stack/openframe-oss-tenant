package com.openframe.sdk.fleetmdm.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

/**
 * Response wrapper for host search results from Fleet MDM
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class HostSearchResponse {
    
    private List<Host> hosts;
    
    @JsonProperty("page")
    private Integer page;
    
    @JsonProperty("per_page")
    private Integer perPage;
    
    @JsonProperty("order_key")
    private String orderKey;
    
    @JsonProperty("order_direction")
    private String orderDirection;
    
    @JsonProperty("query")
    private String query;

    public List<Host> getHosts() {
        return hosts;
    }

    public void setHosts(List<Host> hosts) {
        this.hosts = hosts;
    }

    public Integer getPage() {
        return page;
    }

    public void setPage(Integer page) {
        this.page = page;
    }

    public Integer getPerPage() {
        return perPage;
    }

    public void setPerPage(Integer perPage) {
        this.perPage = perPage;
    }

    public String getOrderKey() {
        return orderKey;
    }

    public void setOrderKey(String orderKey) {
        this.orderKey = orderKey;
    }

    public String getOrderDirection() {
        return orderDirection;
    }

    public void setOrderDirection(String orderDirection) {
        this.orderDirection = orderDirection;
    }

    public String getQuery() {
        return query;
    }

    public void setQuery(String query) {
        this.query = query;
    }
}
