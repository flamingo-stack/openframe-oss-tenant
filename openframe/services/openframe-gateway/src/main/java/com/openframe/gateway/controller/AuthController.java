package com.openframe.gateway.controller;

import com.openframe.security.cookie.CookieService;
import com.openframe.security.pkce.PKCEUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.server.WebSession;
import org.springframework.http.server.reactive.ServerHttpRequest;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

@RestController
@RequestMapping("/oauth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    private final WebClient.Builder webClientBuilder;
    private final CookieService cookieService;

    @Value("${openframe.auth.server.url}")
    private String authServerUrl;

    @Value("${openframe.auth.server.authorize-url}")
    private String authUrl;

    @Value("${openframe.auth.gateway.client.id}")
    private String clientId;

    @Value("${openframe.auth.gateway.client.secret}")
    private String clientSecret;

    @Value("${openframe.auth.gateway.redirect-uri}")
    private String redirectUri;

    @GetMapping("/login")
    public Mono<ResponseEntity<Void>> login(@RequestParam String tenantId, 
                                           ServerHttpRequest request,
                                           WebSession session) {
        log.info("🔑 [AuthController] /auth/login called with tenantId: {}", tenantId);
        log.debug("Starting OAuth2 login flow for tenant: {}", tenantId);
        
        String codeVerifier = PKCEUtils.generateCodeVerifier();
        String codeChallenge = PKCEUtils.generateCodeChallenge(codeVerifier);
        String state = PKCEUtils.generateState();

        // Store the originating frontend host for redirect after authentication
        String origin = request.getHeaders().getFirst("Origin");
        String referer = request.getHeaders().getFirst("Referer");
        String frontendOrigin = determineFrontendOrigin(origin, referer);
        
        session.getAttributes().put("oauth:state", state);
        session.getAttributes().put("oauth:code_verifier:" + state, codeVerifier);
        session.getAttributes().put("oauth:tenant_id:" + state, tenantId);
        session.getAttributes().put("oauth:frontend_origin:" + state, frontendOrigin);

        String authorizeUrl = buildAuthorizeUrl(tenantId, codeChallenge, state);
        log.debug("Redirecting to authorization endpoint for tenant: {}, frontend origin: {}", tenantId, frontendOrigin);

        return Mono.just(ResponseEntity.status(302)
            .header(HttpHeaders.LOCATION, authorizeUrl)
            .build());
    }

    @GetMapping("/callback")
    public Mono<ResponseEntity<Void>> callback(@RequestParam String code,
                                               @RequestParam String state,
                                               WebSession session) {
        log.debug("Processing OAuth2 callback");
        
        OAuthSessionData sessionData = validateAndExtractSessionData(session, state);
        if (sessionData == null) {
            log.warn("Invalid OAuth2 state or missing session data");
            return Mono.just(ResponseEntity.badRequest().build());
        }

        return exchangeCodeForTokens(sessionData, code)
            .map(tokens -> createSuccessResponse(tokens, sessionData));
    }

    @PostMapping("/refresh")
    public Mono<ResponseEntity<Void>> refresh(@RequestParam String tenantId,
                                              @CookieValue(name = "refresh_token", required = false) String refreshCookie) {
        if (refreshCookie == null || refreshCookie.isBlank()) {
            log.warn("Refresh token cookie missing for tenant: {}", tenantId);
            return Mono.just(ResponseEntity.status(401).build());
        }

        log.debug("Refreshing tokens for tenant: {}", tenantId);
        return refreshTokens(tenantId, refreshCookie)
            .map(this::createRefreshResponse);
    }

    @GetMapping("/logout")
    public Mono<ResponseEntity<Void>> logout(@RequestParam String tenantId, WebSession session) {
        log.debug("Logging out user for tenant: {}", tenantId);
        // Invalidate session to prevent session fixation and clear state
        
        HttpHeaders headers = new HttpHeaders();
        
        ResponseCookie clearedAccess = ResponseCookie.from("access_token", "")
            .path("/")
            .maxAge(0)
            .build();
        
        ResponseCookie clearedRefresh = ResponseCookie.from("refresh_token", "")
            .path("/oauth/refresh")
            .maxAge(0)
            .build();
        
        headers.add(HttpHeaders.SET_COOKIE, clearedAccess.toString());
        headers.add(HttpHeaders.SET_COOKIE, clearedRefresh.toString());
        
        headers.add(HttpHeaders.LOCATION, "/");
        
        log.debug("Successfully logged out user for tenant: {}", tenantId);
        return session.invalidate().then(Mono.just(new ResponseEntity<>(headers, org.springframework.http.HttpStatus.FOUND)));
    }

    private String buildAuthorizeUrl(String tenantId, String codeChallenge, String state) {
        return String.format(
            "%s/%s/oauth2/authorize?response_type=code&client_id=%s&code_challenge=%s&code_challenge_method=S256&redirect_uri=%s&scope=openid%%20profile%%20email%%20offline_access&state=%s",
            authUrl,
            tenantId,
            clientId,
            codeChallenge,
            PKCEUtils.urlEncode(redirectUri),
            state);
    }

    private OAuthSessionData validateAndExtractSessionData(WebSession session, String state) {
        String expectedState = (String) session.getAttributes().get("oauth:state");
        if (expectedState == null || !expectedState.equals(state)) {
            return null;
        }

        String codeVerifier = (String) session.getAttributes().get("oauth:code_verifier:" + state);
        String tenantId = (String) session.getAttributes().get("oauth:tenant_id:" + state);
        String frontendOrigin = (String) session.getAttributes().get("oauth:frontend_origin:" + state);
        
        if (codeVerifier == null || tenantId == null) {
            return null;
        }

        session.getAttributes().remove("oauth:state");
        session.getAttributes().remove("oauth:code_verifier:" + state);
        session.getAttributes().remove("oauth:tenant_id:" + state);
        session.getAttributes().remove("oauth:frontend_origin:" + state);

        return new OAuthSessionData(codeVerifier, tenantId, frontendOrigin);
    }

    private Mono<TokenResponse> exchangeCodeForTokens(OAuthSessionData sessionData, String code) {
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("grant_type", "authorization_code");
        form.add("code", code);
        form.add("code_verifier", sessionData.codeVerifier());
        form.add("redirect_uri", redirectUri);

        return webClientBuilder.build()
            .post()
            .uri(String.format("%s/%s/oauth2/token", authServerUrl, sessionData.tenantId()))
            .header(HttpHeaders.AUTHORIZATION, basicAuth(clientId, clientSecret))
            .body(BodyInserters.fromFormData(form))
            .retrieve()
                .onStatus(s -> s.is4xxClientError() || s.is5xxServerError(), resp -> {
                    log.error("Token exchange failed: status={}", resp.statusCode());
                    return resp.bodyToMono(String.class).then(Mono.error(new IllegalStateException("Token exchange failed")));
                })
            .bodyToMono(TokenResponse.class);
    }

    private Mono<TokenResponse> refreshTokens(String tenantId, String refreshToken) {
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("grant_type", "refresh_token");
        form.add("refresh_token", refreshToken);

        return webClientBuilder.build()
            .post()
            .uri(String.format("%s/%s/oauth2/token", authServerUrl, tenantId))
            .header(HttpHeaders.AUTHORIZATION, basicAuth(clientId, clientSecret))
            .body(BodyInserters.fromFormData(form))
            .retrieve()
                .onStatus(s -> s.is4xxClientError() || s.is5xxServerError(), resp -> {
                    log.error("Token refresh failed: status={}", resp.statusCode());
                    return resp.bodyToMono(String.class).then(Mono.error(new IllegalStateException("Token refresh failed")));
                })
            .bodyToMono(TokenResponse.class);
    }

    private ResponseEntity<Void> createSuccessResponse(TokenResponse tokens, OAuthSessionData sessionData) {
        HttpHeaders headers = new HttpHeaders();
        
        // Dynamically determine callback URL based on frontend origin
        String callbackUrl = determineCallbackUrl(sessionData.frontendOrigin());
        headers.add(HttpHeaders.LOCATION, callbackUrl);

        ResponseCookie access = cookieService.createAccessTokenCookie(tokens.access_token());
        ResponseCookie refresh = cookieService.createRefreshTokenCookie(tokens.refresh_token());

        headers.add(HttpHeaders.SET_COOKIE, access.toString());
        headers.add(HttpHeaders.SET_COOKIE, refresh.toString());

        log.debug("Successfully set tokens for tenant: {}, redirecting to {}", sessionData.tenantId(), callbackUrl);
        return new ResponseEntity<>(headers, org.springframework.http.HttpStatus.FOUND);
    }

    private ResponseEntity<Void> createRefreshResponse(TokenResponse tokens) {
        HttpHeaders headers = new HttpHeaders();
        
        ResponseCookie access = cookieService.createAccessTokenCookie(tokens.access_token());
        ResponseCookie refresh = cookieService.createRefreshTokenCookie(tokens.refresh_token());
        
        headers.add(HttpHeaders.SET_COOKIE, access.toString());
        headers.add(HttpHeaders.SET_COOKIE, refresh.toString());
        
        log.debug("Successfully refreshed tokens");
        return new ResponseEntity<>(headers, org.springframework.http.HttpStatus.NO_CONTENT);
    }


    private String basicAuth(String clientId, String clientSecret) {
        String raw = clientId + ":" + clientSecret;
        return "Basic " + Base64.getEncoder().encodeToString(raw.getBytes(StandardCharsets.UTF_8));
    }

    /**
     * Determine the frontend origin from request headers
     */
    private String determineFrontendOrigin(String origin, String referer) {
        // First try Origin header (most reliable for CORS requests)
        if (origin != null && !origin.isEmpty()) {
            log.debug("Using Origin header for frontend detection: {}", origin);
            return origin;
        }
        
        // Fall back to Referer header
        if (referer != null && !referer.isEmpty()) {
            try {
                String refererOrigin = referer.substring(0, referer.indexOf('/', 8)); // Extract origin from URL
                log.debug("Using Referer header for frontend detection: {}", refererOrigin);
                return refererOrigin;
            } catch (Exception e) {
                log.warn("Failed to parse referer header: {}", referer);
            }
        }
        
        // Default fallback to localhost (production gateway)
        String defaultOrigin = "http://localhost";
        log.debug("Using default origin for frontend detection: {}", defaultOrigin);
        return defaultOrigin;
    }

    /**
     * Determine the appropriate callback URL based on frontend origin
     */
    private String determineCallbackUrl(String frontendOrigin) {
        if (frontendOrigin == null || frontendOrigin.isEmpty()) {
            return "/auth/callback"; // Relative URL fallback
        }
        
        // For development frontend (port 4000), redirect to that port
        if (frontendOrigin.contains(":4000")) {
            return frontendOrigin + "/auth/callback";
        }
        
        // For production or other cases, use relative URL
        return "/auth/callback";
    }

    private record OAuthSessionData(String codeVerifier, String tenantId, String frontendOrigin) {}
}


