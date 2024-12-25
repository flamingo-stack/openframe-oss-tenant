package com.openframe.security.jwt;

import java.io.IOException;

import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
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
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 100)
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;
    private final UserRepository userRepository;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        

        log.info("Processing request: {} {} with auth: {}", request.getMethod(), request.getRequestURI(), request.getHeader("Authorization"));
        // Skip JWT check for OPTIONS requests (CORS preflight)
        if (request.getMethod().equals("OPTIONS")) {
            log.debug("Skipping JWT filter for OPTIONS request");
            filterChain.doFilter(request, response);
            return;
        }
        
        // Skip JWT check for permitted paths
        String requestPath = request.getRequestURI();
        if (isPermittedPath(requestPath)) {
            log.debug("Skipping JWT filter for permitted path: {}", requestPath);
            filterChain.doFilter(request, response);
            return;
        }
        
        final String authHeader = request.getHeader("Authorization");
        log.info("Processing request: {} {} with auth: {}", 
            request.getMethod(), 
            request.getRequestURI(),
            authHeader != null ? "Bearer token present" : "no auth");
        
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            log.debug("No valid auth header found, rejecting request");
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }

        try {
            String jwt = authHeader.substring(7);
            String userEmail = jwtService.extractUsername(jwt);
            log.info("Extracted email from JWT: {}", userEmail);
            
            // Check if user exists in DB
            var userExists = userRepository.findByEmail(userEmail);
            log.info("User exists in DB: {}", userExists.isPresent());
            
            if (userEmail != null) {
                log.debug("Loading user details for email: {}", userEmail);
                try {
                    UserDetails userDetails = this.userDetailsService.loadUserByUsername(userEmail);
                    log.debug("Loaded user details: {}", userDetails);
                    
                    if (jwtService.isTokenValid(jwt, userDetails)) {
                        log.debug("JWT token is valid");
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
                    }
                } catch (UsernameNotFoundException e) {
                    log.error("User not found in database: {}", userEmail);
                }
            }
        } catch (Exception e) {
            log.error("Error processing JWT token: {}", e.getMessage(), e);
        }
        
        filterChain.doFilter(request, response);
    }

    private boolean isPermittedPath(String path) {
        return path.startsWith("/health") ||
               path.startsWith("/metrics") ||
               path.startsWith("/actuator") ||
               path.startsWith("/oauth/token") ||
               path.startsWith("/oauth/register") ||
               path.equals("/.well-known/openid-configuration");
    }
} 