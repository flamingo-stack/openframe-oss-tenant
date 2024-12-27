package com.openframe.security.jwt;

import java.io.IOException;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.openframe.data.repository.mongo.UserRepository;
import com.openframe.security.UserSecurity;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
public class JwtAuthenticationFilter extends OncePerRequestFilter implements JwtAuthenticationOperations {

    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;
    private final UserRepository userRepository;

    public JwtAuthenticationFilter(
            JwtService jwtService,
            UserDetailsService userDetailsService,
            UserRepository userRepository) {
        this.jwtService = jwtService;
        this.userDetailsService = userDetailsService;
        this.userRepository = userRepository;
    }

    @Value("${management.endpoints.web.base-path}")
    private String managementPath;

    @Override
    public String getManagementPath() {
        return managementPath;
    }

    @Override
    public JwtService getJwtService() {
        return jwtService;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        
        String path = request.getRequestURI();
        
        // Skip JWT check for OPTIONS requests (CORS preflight)
        if (request.getMethod().equals("OPTIONS")) {
            log.debug("Skipping JWT filter for OPTIONS request");
            filterChain.doFilter(request, response);
            return;
        }

        // Skip JWT check for permitted paths
        if (isPermittedPath(path)) {
            log.debug("Skipping JWT filter for permitted path: {}", path);
            filterChain.doFilter(request, response);
            return;
        }

        String authHeader = request.getHeader("Authorization");
        log.info("Processing request: {} {} with auth: {}", 
            request.getMethod(), 
            path,
            authHeader != null ? "Bearer token present" : "no auth");

        String jwt = extractJwt(authHeader);
        if (jwt == null) {
            log.debug("No valid auth header found, rejecting request");
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }

        try {
            String userEmail = extractUsername(jwt);
            if (userEmail == null) {
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                return;
            }

            if (userEmail != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                try {
                    UserDetails userDetails = this.userDetailsService.loadUserByUsername(userEmail);
                    log.debug("Loaded user details: {}", userDetails);
                    
                    if (validateToken(jwt, userDetails)) {
                        var user = userRepository.findByEmail(userEmail).orElseThrow();
                        log.debug("Found user in repository: {}", user);
                        var principal = new UserSecurity(user);
                        log.debug("Created UserSecurity principal: {}", principal);
                        
                        var authentication = new UsernamePasswordAuthenticationToken(
                            principal,
                            null,
                            userDetails.getAuthorities()
                        );
                        authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                        SecurityContextHolder.getContext().setAuthentication(authentication);
                        log.info("Authentication set in SecurityContext");
                        filterChain.doFilter(request, response);
                        return;
                    }
                } catch (UsernameNotFoundException e) {
                    log.error("User not found in database: {}", userEmail);
                }
            }
        } catch (Exception e) {
            log.error("Error processing JWT token: {}", e.getMessage(), e);
        }
        
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
    }
} 