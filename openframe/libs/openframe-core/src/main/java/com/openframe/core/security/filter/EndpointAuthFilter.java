package com.openframe.core.security.filter;

import java.io.IOException;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class EndpointAuthFilter extends OncePerRequestFilter {
    
    private static final String ENDPOINT_AUTH_HEADER = "X-Endpoint-Key";
    
    @Value("${security.endpoints.secret-key}")
    private String endpointSecretKey;
    
    @Override
    protected void doFilterInternal(HttpServletRequest request, 
            HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        
        String endpointKey = request.getHeader(ENDPOINT_AUTH_HEADER);
        
        if (endpointKey != null && endpointKey.equals(endpointSecretKey)) {
            var auth = new UsernamePasswordAuthenticationToken(
                "endpoint", 
                null, 
                List.of(new SimpleGrantedAuthority("ROLE_ENDPOINT"))
            );
            SecurityContextHolder.getContext().setAuthentication(auth);
        }
        
        filterChain.doFilter(request, response);
    }
    
    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getServletPath();
        return !path.startsWith("/api/v1/data/");
    }
} 