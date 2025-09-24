package com.openframe.sdk.fleetmdm.model;

/**
 * Request parameters for host search
 */
public class HostSearchRequest {
    
    private String query;
    private Integer page;
    private Integer perPage;
    private String orderKey;
    private String orderDirection;
    
    public HostSearchRequest() {
        // Default values
        this.page = 0;
        this.perPage = 100;
    }
    
    public HostSearchRequest(String query) {
        this();
        this.query = query;
    }
    
    public HostSearchRequest(String query, Integer page, Integer perPage) {
        this.query = query;
        this.page = page != null ? page : 0;
        this.perPage = perPage != null ? perPage : 100;
    }

    public String getQuery() {
        return query;
    }

    public void setQuery(String query) {
        this.query = query;
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
}
