package com.openframe.gateway.security.jwt;

import com.openframe.data.repository.mongo.OAuthClientRepository;
import com.openframe.data.repository.mongo.UserRepository;
import com.openframe.security.adapter.UserSecurity;
import com.openframe.security.jwt.JwtService;
import com.openframe.security.adapter.OAuthClientSecurity;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
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

import java.io.IOException;

@Slf4j
@Component
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
// TODO: remove as spring skip it inside reactive environment
public class GatewayJwtAuthenticationFilter extends OncePerRequestFilter implements JwtAuthenticationOperations {
    @Getter
    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;
    private final UserDetailsService oauthClientUserDetailsService;
    private final UserRepository userRepository;
    private final OAuthClientRepository oAuthClientRepository;

    @Value("${management.endpoints.web.base-path}")
    @Getter
    private String managementPath;

    public GatewayJwtAuthenticationFilter(
            JwtService jwtService,
            UserDetailsService userDetailsService,
            UserDetailsService oauthClientUserDetailsService,
            UserRepository userRepository,
            OAuthClientRepository oAuthClientRepository
    ) {
        this.jwtService = jwtService;
        this.userDetailsService = userDetailsService;
        this.oauthClientUserDetailsService = oauthClientUserDetailsService;
        this.userRepository = userRepository;
        this.oAuthClientRepository = oAuthClientRepository;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {


        String path = getPath(request);
        String method = getMethod(request);

        if (isPermittedPath(path, method)) {
            filterChain.doFilter(request, response);
            return;
        }

        String authToken = getRequestAuthToken(request);
        logAuthAttempt(method, path, authToken);

        String jwt = extractJwt(authToken);
        if (jwt == null) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }

        String grantType = extractGrantType(jwt);
        if ("client_credentials".equals(grantType)) {
            String clientId = extractClientId(jwt);
            if (clientId == null) {
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            }

            if (SecurityContextHolder.getContext().getAuthentication() == null) {
                try {
                    UserDetails userDetails = oauthClientUserDetailsService.loadUserByUsername(clientId);
                    if (validateToken(jwt, userDetails)) {
                        var client = oAuthClientRepository.findByClientId(clientId)
                                .orElseThrow(() -> new UsernameNotFoundException("Client not found"));
                        var principal = new OAuthClientSecurity(client);
                        var authentication = new UsernamePasswordAuthenticationToken(principal, null, userDetails.getAuthorities());
                        authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                        SecurityContextHolder.getContext().setAuthentication(authentication);
                        filterChain.doFilter(request, response);
                        return;
                    }
                } catch (Exception e) {
                    log.error("Authentication failed: {}", e.getMessage(), e);
                }
            }
        }

        if ("password".equals(grantType)) {
            String userEmail = extractUsername(jwt);
            if (userEmail == null) {
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                return;
            }

            if (SecurityContextHolder.getContext().getAuthentication() == null) {
                try {
                    UserDetails userDetails = userDetailsService.loadUserByUsername(userEmail);

                    if (validateToken(jwt, userDetails)) {
                        var user = userRepository.findByEmail(userEmail)
                                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + userEmail));

                        var principal = new UserSecurity(user);
                        var authentication = new UsernamePasswordAuthenticationToken(
                                principal,
                                null,
                                userDetails.getAuthorities()
                        );
                        authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                        SecurityContextHolder.getContext().setAuthentication(authentication);

                        filterChain.doFilter(request, response);
                        return;
                    }
                } catch (Exception e) {
                    log.error("Authentication failed: {}", e.getMessage(), e);
                }
            }
        }

        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
    }
}
