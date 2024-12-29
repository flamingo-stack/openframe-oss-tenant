package com.openframe.security.cors;

import org.springframework.web.server.ServerWebExchange;

import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletResponse;

public interface CorsOperations {
    default void addCors(ServletResponse response, String origin) {
        if (origin == null) return;
        
        if (response instanceof HttpServletResponse httpResponse) {
            httpResponse.setHeader("Access-Control-Allow-Origin", origin);
            httpResponse.setHeader("Access-Control-Allow-Credentials", "true");
            httpResponse.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
            httpResponse.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type, x-requested-with");
            httpResponse.setHeader("Access-Control-Max-Age", "3600");
            httpResponse.setHeader("Access-Control-Expose-Headers", "Authorization, Content-Type");
        }
    }

    default void addCors(ServerWebExchange exchange, String origin) {
        if (origin == null) return;
        
        exchange.getResponse().getHeaders().add("Access-Control-Allow-Origin", origin);
        exchange.getResponse().getHeaders().add("Access-Control-Allow-Credentials", "true");
        exchange.getResponse().getHeaders().add("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        exchange.getResponse().getHeaders().add("Access-Control-Allow-Headers", "Authorization, Content-Type, x-requested-with");
        exchange.getResponse().getHeaders().add("Access-Control-Max-Age", "3600");
        exchange.getResponse().getHeaders().add("Access-Control-Expose-Headers", "Authorization, Content-Type");
    }
} 