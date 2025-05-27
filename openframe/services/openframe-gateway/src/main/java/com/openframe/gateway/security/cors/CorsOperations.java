package com.openframe.gateway.security.cors;

import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.server.ServerWebExchange;

public interface CorsOperations {
    default void addCors(ServletResponse response, String origin) {
        if (response instanceof HttpServletResponse httpResponse) {
            httpResponse.setHeader("Access-Control-Allow-Origin", "*");
            httpResponse.setHeader("Access-Control-Allow-Credentials", "true");
            httpResponse.setHeader("Access-Control-Allow-Methods", "GET, PATCH, POST, PUT, DELETE, OPTIONS");
            httpResponse.setHeader("Access-Control-Allow-Headers", "*");
            httpResponse.setHeader("Access-Control-Max-Age", "3600");
            httpResponse.setHeader("Access-Control-Expose-Headers", "Authorization, Content-Type");
        }
    }

    default void addCors(ServerWebExchange exchange, String origin) {
        exchange.getResponse().getHeaders().add("Access-Control-Allow-Origin", "*");
        exchange.getResponse().getHeaders().add("Access-Control-Allow-Credentials", "true");
        exchange.getResponse().getHeaders().add("Access-Control-Allow-Methods", "GET, PATCH, POST, PUT, DELETE, OPTIONS");
        exchange.getResponse().getHeaders().add("Access-Control-Allow-Headers", "*");
        exchange.getResponse().getHeaders().add("Access-Control-Max-Age", "3600");
        exchange.getResponse().getHeaders().add("Access-Control-Expose-Headers", "Authorization, Content-Type");
    }
} 