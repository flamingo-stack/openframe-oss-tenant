package com.openframe.authz.filter;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.openframe.security.cookie.CookieService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.ContentCachingResponseWrapper;

import java.io.IOException;

/**
 * Filter that intercepts OAuth2 token responses and sets tokens as HttpOnly cookies
 * This allows us to use standard Spring Authorization Server while maintaining cookie-based auth
 */
@Component
@Order(2)
@RequiredArgsConstructor
@Slf4j
public class TokenResponseCookieFilter extends OncePerRequestFilter {

    private final CookieService cookieService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, 
                                   FilterChain filterChain) throws ServletException, IOException {
        
        String requestPath = request.getRequestURI();
        
        if (isTokenEndpoint(requestPath)) {
            log.debug("Intercepting token endpoint response to set cookies");

            ContentCachingResponseWrapper wrapped = new ContentCachingResponseWrapper(response);
            filterChain.doFilter(request, wrapped);

            try {
                byte[] body = wrapped.getContentAsByteArray();
                int status = wrapped.getStatus();
                String contentType = wrapped.getContentType();
                log.debug("Token endpoint downstream response: status={}, contentType={}, bodySize={} bytes",
                        status, contentType, body.length);

                if (status == 200 && body.length > 0) {
                    JsonNode tokenResponse = objectMapper.readTree(body);

                    JsonNode accessNode = tokenResponse.get("access_token");
                    JsonNode refreshNode = tokenResponse.get("refresh_token");
                    if (accessNode != null) {
                        cookieService.setAccessTokenCookie(wrapped, accessNode.asText());
                    }
                    if (refreshNode != null) {
                        cookieService.setRefreshTokenCookie(wrapped, refreshNode.asText());
                    }
                    log.debug("Successfully set tokens as HttpOnly cookies");
                } else {
                    log.warn("Token endpoint returned non-200 or empty body: status={}, bodySize={}", status, body.length);
                }
            } catch (Exception e) {
                log.error("Failed to parse token response and set cookies", e);
            } finally {
                wrapped.copyBodyToResponse();
            }
            return;
        }

        filterChain.doFilter(request, response);
    }

    private boolean isTokenEndpoint(String requestPath) {
        return "/oauth2/token".equals(requestPath);
    }
}
