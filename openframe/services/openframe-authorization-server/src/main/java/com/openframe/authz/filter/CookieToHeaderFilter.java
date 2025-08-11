package com.openframe.authz.filter;

import com.openframe.security.cookie.CookieService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

/**
 * Filter that converts HttpOnly cookies to Authorization headers
 * This allows Spring Authorization Server to work with cookie-based authentication
 */
@Component
@Order(1)
@RequiredArgsConstructor
@Slf4j
public class CookieToHeaderFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, 
                                   FilterChain filterChain) throws ServletException, IOException {
        
        String requestPath = request.getRequestURI();
        log.debug("Processing request: {} {}", request.getMethod(), requestPath);

        if (isTokenEndpoint(requestPath)) {
            final String refreshToken = extractRefreshTokenFromCookies(request);

            HttpServletRequestWrapper wrappedRequest = new HttpServletRequestWrapper(request) {
                @Override
                public String getParameter(String name) {
                    if ("refresh_token".equals(name) && "refresh_token".equals(super.getParameter("grant_type")) && StringUtils.hasText(refreshToken)) {
                        return refreshToken;
                    }
                    return super.getParameter(name);
                }

                @Override
                public Map<String, String[]> getParameterMap() {
                    Map<String, String[]> paramMap = new HashMap<>(super.getParameterMap());
                    if ("refresh_token".equals(super.getParameter("grant_type")) && StringUtils.hasText(refreshToken)) {
                        paramMap.put("refresh_token", new String[]{refreshToken});
                    }
                    return paramMap;
                }

                @Override
                public String[] getParameterValues(String name) {
                    if ("refresh_token".equals(name) && "refresh_token".equals(super.getParameter("grant_type")) && StringUtils.hasText(refreshToken)) {
                        return new String[]{refreshToken};
                    }
                    return super.getParameterValues(name);
                }
            };

            filterChain.doFilter(wrappedRequest, response);
            return;
        }
        
        filterChain.doFilter(request, response);
    }

    /**
     * Check if this is a token endpoint request
     */
    private boolean isTokenEndpoint(String requestPath) {
        return "/oauth2/token".equals(requestPath);
    }

    /**
     * Extract refresh token from HttpOnly cookies
     */
    private String extractRefreshTokenFromCookies(HttpServletRequest request) {
        if (request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) {
                if (CookieService.REFRESH_TOKEN_COOKIE.equals(cookie.getName())) {
                    return cookie.getValue();
                }
            }
        }
        return null;
    }
}
