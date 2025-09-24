package com.openframe.gateway.controller;

import com.openframe.security.cookie.CookieService;
import com.openframe.security.pkce.PKCEUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.server.WebSession;
import reactor.core.publisher.Mono;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import static com.openframe.gateway.security.SecurityConstants.*;
import static java.util.UUID.randomUUID;
import static org.springframework.http.HttpHeaders.AUTHORIZATION;
import static org.springframework.http.HttpStatus.FOUND;
import static org.springframework.http.HttpStatus.NO_CONTENT;
import static org.springframework.util.StringUtils.hasText;

@RestController
@RequestMapping("/oauth")
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "openframe.gateway.oauth", name = "enable", havingValue = "true")
@Slf4j
public class AuthController {

    private final WebClient.Builder webClientBuilder;
    private final CookieService cookieService;

    // Dev-only in-memory ticket store (localhost only)
    private static final Map<String, TokenResponse> DEV_TICKETS = new ConcurrentHashMap<>();

    @Value("${openframe.auth.server.url}")
    private String authServerUrl;

    @Value("${openframe.auth.server.authorize-url}")
    private String authUrl;

    @Value("${openframe.gateway.oauth.client-id}")
    private String clientId;

    @Value("${openframe.gateway.oauth.client-secret}")
    private String clientSecret;

    @Value("${openframe.gateway.oauth.redirect-uri}")
    private String redirectUri;

    @GetMapping("/login")
    public Mono<ResponseEntity<Void>> login(@RequestParam String tenantId,
                                            @RequestParam(value = "redirectTo", required = false) String redirectTo,
                                            @RequestParam(value = "provider", required = false) String provider,
                                            WebSession session,
                                            ServerHttpRequest request) {
        log.info("🔑 [AuthController] /auth/login called with tenantId: {}", tenantId);
        log.debug("Starting OAuth2 login flow for tenant: {}", tenantId);
        
        String codeVerifier = PKCEUtils.generateCodeVerifier();
        String codeChallenge = PKCEUtils.generateCodeChallenge(codeVerifier);
        String state = PKCEUtils.generateState();

        session.getAttributes().put("oauth:state", state);
        session.getAttributes().put("oauth:code_verifier:" + state, codeVerifier);
        session.getAttributes().put("oauth:tenant_id:" + state, tenantId);

        String effectiveRedirect = resolveRedirectTarget(redirectTo, request);
        if (isAbsoluteUrl(effectiveRedirect)) {
            session.getAttributes().put("oauth:redirect_to:" + state, effectiveRedirect);
        }

        String authorizeUrl = buildAuthorizeUrl(tenantId, codeChallenge, state, provider);
        log.debug("Redirecting to authorization endpoint for tenant: {}", tenantId);

        return Mono.just(ResponseEntity.status(302)
            .header(HttpHeaders.LOCATION, authorizeUrl)
            .build());
    }

    @GetMapping("/callback")
    public Mono<ResponseEntity<Void>> callback(@RequestParam String code,
                                               @RequestParam String state,
                                               WebSession session,
                                               ServerHttpRequest request) {
        log.debug("Processing OAuth2 callback");
        
        OAuthSessionData sessionData = validateAndExtractSessionData(session, state);
        if (sessionData == null) {
            log.warn("Invalid OAuth2 state or missing session data");
            return Mono.just(ResponseEntity.badRequest().build());
        }

        boolean includeDevTicket = isLocalHost(request);

        return exchangeCodeForTokens(sessionData, code)
                .map(tokens -> createSuccessResponse(tokens, sessionData.tenantId(), sessionData.redirectTo(), includeDevTicket))
                .switchIfEmpty(Mono.fromSupplier(() -> {
                    log.error("Token exchange returned empty body");
                    HttpHeaders headers = new HttpHeaders();
                    String target = resolveErrorRedirect(sessionData.redirectTo(), request, "error=oauth_failed&message=empty_token_response");
                    headers.add(HttpHeaders.LOCATION, target);
                    return new ResponseEntity<>(headers, FOUND);
                }))
                .onErrorResume(e -> {
                    log.error("Token exchange failed", e);
                    String msg;
                    try {
                        msg = URLEncoder.encode(e.getMessage() != null ? e.getMessage() : "token_exchange_failed", StandardCharsets.UTF_8);
                    } catch (Exception ex) {
                        msg = "token_exchange_failed";
                    }
                    HttpHeaders headers = new HttpHeaders();
                    String target = resolveErrorRedirect(sessionData.redirectTo(), request, "error=oauth_failed&message=" + msg);
                    headers.add(HttpHeaders.LOCATION, target);
                    return Mono.just(new ResponseEntity<>(headers, FOUND));
                });
    }

    @PostMapping("/refresh")
    public Mono<ResponseEntity<Void>> refresh(@RequestParam String tenantId,
                                              @CookieValue(name = REFRESH_TOKEN, required = false) String refreshCookie,
                                              ServerHttpRequest request) {
        String token = hasText(refreshCookie) ? refreshCookie : request.getHeaders().getFirst(REFRESH_TOKEN_HEADER);
        if (!hasText(token)) {
            log.warn("Refresh token not provided via cookie or header for tenant: {}", tenantId);
            return Mono.just(ResponseEntity.status(401).build());
        }

        log.debug("Refreshing tokens for tenant: {}", tenantId);
        boolean includeDevHeaders = isLocalHost(request);
        return refreshTokens(tenantId, token)
                .map(tokens -> createRefreshResponse(tokens, includeDevHeaders));
    }

    @GetMapping("/logout")
    public Mono<ResponseEntity<Void>> logout(@RequestParam String tenantId, WebSession session) {
        log.debug("Logging out user for tenant: {}", tenantId);

        HttpHeaders headers = new HttpHeaders();

        ResponseCookie clearedAccess = ResponseCookie.from(ACCESS_TOKEN, "")
            .path("/")
            .maxAge(0)
            .build();

        ResponseCookie clearedRefresh = ResponseCookie.from(REFRESH_TOKEN, "")
            .path("/oauth/refresh")
            .maxAge(0)
            .build();
        
        headers.add(HttpHeaders.SET_COOKIE, clearedAccess.toString());
        headers.add(HttpHeaders.SET_COOKIE, clearedRefresh.toString());
        
        log.debug("Successfully logged out user for tenant: {}", tenantId);
        return session.invalidate().then(Mono.just(new ResponseEntity<>(headers, NO_CONTENT)));
    }

    private String buildAuthorizeUrl(String tenantId, String codeChallenge, String state, String provider) {
        String base = String.format(
            "%s/%s/oauth2/authorize?response_type=code&client_id=%s&code_challenge=%s&code_challenge_method=S256&redirect_uri=%s&scope=openid%%20profile%%20email%%20offline_access&state=%s",
            authUrl,
            tenantId,
            clientId,
            codeChallenge,
            PKCEUtils.urlEncode(redirectUri),
            state);
        if (StringUtils.hasText(provider)) {
            base = base + "&provider=" + provider;
        }
        return base;
    }

    private OAuthSessionData validateAndExtractSessionData(WebSession session, String state) {
        String expectedState = (String) session.getAttributes().get("oauth:state");
        if (expectedState == null || !expectedState.equals(state)) {
            return null;
        }

        String codeVerifier = (String) session.getAttributes().get("oauth:code_verifier:" + state);
        String tenantId = (String) session.getAttributes().get("oauth:tenant_id:" + state);
        String redirectTo = (String) session.getAttributes().get("oauth:redirect_to:" + state);
        
        if (codeVerifier == null || tenantId == null) {
            return null;
        }

        session.getAttributes().remove("oauth:state");
        session.getAttributes().remove("oauth:code_verifier:" + state);
        session.getAttributes().remove("oauth:tenant_id:" + state);
        session.getAttributes().remove("oauth:redirect_to:" + state);

        return new OAuthSessionData(codeVerifier, tenantId, isAbsoluteUrl(redirectTo) ? redirectTo : null);
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
                .header(AUTHORIZATION, basicAuth(clientId, clientSecret))
                .header(HttpHeaders.ACCEPT, "application/json")
            .body(BodyInserters.fromFormData(form))
            .retrieve()
                .onStatus(s -> s.is4xxClientError() || s.is5xxServerError(), resp ->
                        resp.bodyToMono(String.class).defaultIfEmpty("")
                                .flatMap(body -> {
                                    String wwwAuth = resp.headers().asHttpHeaders().getFirst(HttpHeaders.WWW_AUTHENTICATE);
                                    log.error("Token exchange failed: status={}, www-authenticate={}, body={}",
                                            resp.statusCode(), wwwAuth, body);
                                    return Mono.error(new IllegalStateException("token_exchange_failed:" + body));
                                })
                )
            .bodyToMono(TokenResponse.class);
    }

    private Mono<TokenResponse> refreshTokens(String tenantId, String refreshToken) {
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("grant_type", "refresh_token");
        form.add("refresh_token", refreshToken);

        return webClientBuilder.build()
            .post()
            .uri(String.format("%s/%s/oauth2/token", authServerUrl, tenantId))
                .header(AUTHORIZATION, basicAuth(clientId, clientSecret))
                .header(HttpHeaders.ACCEPT, "application/json")
            .body(BodyInserters.fromFormData(form))
            .retrieve()
                .onStatus(s -> s.is4xxClientError() || s.is5xxServerError(), resp ->
                        resp.bodyToMono(String.class).defaultIfEmpty("")
                                .flatMap(body -> {
                                    String wwwAuth = resp.headers().asHttpHeaders().getFirst(HttpHeaders.WWW_AUTHENTICATE);
                                    log.error("Token refresh failed: status={}, www-authenticate={}, body={}",
                                            resp.statusCode(), wwwAuth, body);
                                    return Mono.error(new IllegalStateException("token_refresh_failed:" + body));
                                })
                )
            .bodyToMono(TokenResponse.class);
    }

    private ResponseEntity<Void> createSuccessResponse(TokenResponse tokens, String tenantId, String redirectTo, boolean includeDevTicket) {
        HttpHeaders headers = new HttpHeaders();
        String target = redirectTo != null && !redirectTo.isBlank() ? redirectTo : "/";

        if (includeDevTicket) {
            String ticket = randomUUID().toString();
            DEV_TICKETS.put(ticket, tokens);
            if (target.contains("?")) {
                target = target + "&devTicket=" + ticket;
            } else {
                target = target + "?devTicket=" + ticket;
            }
        }

        headers.add(HttpHeaders.LOCATION, target);

        ResponseCookie access = cookieService.createAccessTokenCookie(tokens.access_token());
        ResponseCookie refresh = cookieService.createRefreshTokenCookie(tokens.refresh_token());

        headers.add(HttpHeaders.SET_COOKIE, access.toString());
        headers.add(HttpHeaders.SET_COOKIE, refresh.toString());

        log.debug("Successfully set tokens for tenant: {}", tenantId);
        return new ResponseEntity<>(headers, FOUND);
    }

    private ResponseEntity<Void> createRefreshResponse(TokenResponse tokens, boolean includeDevHeaders) {
        HttpHeaders headers = new HttpHeaders();
        
        ResponseCookie access = cookieService.createAccessTokenCookie(tokens.access_token());
        ResponseCookie refresh = cookieService.createRefreshTokenCookie(tokens.refresh_token());
        
        headers.add(HttpHeaders.SET_COOKIE, access.toString());
        headers.add(HttpHeaders.SET_COOKIE, refresh.toString());
        if (includeDevHeaders) {
            if (hasText(tokens.access_token())) {
                headers.add(ACCESS_TOKEN_HEADER, tokens.access_token());
            }
            if (hasText(tokens.refresh_token())) {
                headers.add(REFRESH_TOKEN_HEADER, tokens.refresh_token());
            }
        }

        log.debug("Successfully refreshed tokens");
        return new ResponseEntity<>(headers, NO_CONTENT);
    }

    @GetMapping("/dev-exchange")
    public ResponseEntity<Void> devExchange(@RequestParam("ticket") String ticket,
                                            ServerHttpRequest request) {
        if (!isLocalHost(request)) {
            return ResponseEntity.status(404).build();
        }
        TokenResponse tokens = DEV_TICKETS.remove(ticket);
        if (tokens == null) {
            return ResponseEntity.status(404).build();
        }
        HttpHeaders headers = new HttpHeaders();
        if (hasText(tokens.access_token())) {
            headers.add(ACCESS_TOKEN_HEADER, tokens.access_token());
        }
        if (hasText(tokens.refresh_token())) {
            headers.add(REFRESH_TOKEN_HEADER, tokens.refresh_token());
        }
        return new ResponseEntity<>(headers, NO_CONTENT);
    }

    private String basicAuth(String clientId, String clientSecret) {
        String raw = clientId + ":" + clientSecret;
        return "Basic " + Base64.getEncoder().encodeToString(raw.getBytes(StandardCharsets.UTF_8));
    }

    private static boolean isAbsoluteUrl(String url) {
        if (url == null) return false;
        String u = url.toLowerCase();
        return (u.startsWith("https://") || u.startsWith("http://"));
    }

    private record OAuthSessionData(String codeVerifier, String tenantId, String redirectTo) {
    }

    private String resolveRedirectTarget(String redirectTo, ServerHttpRequest request) {
        String effectiveRedirect = redirectTo;
        if (!hasText(effectiveRedirect)) {
            String referer = request.getHeaders().getFirst(HttpHeaders.REFERER);
            if (hasText(referer)) {
                effectiveRedirect = referer;
                log.debug("Captured redirect target from Referer header: {}", referer);
            }
        }
        return effectiveRedirect;
    }

    private String resolveErrorRedirect(String originalRedirectTo, ServerHttpRequest request, String errorQuery) {
        String target = isAbsoluteUrl(originalRedirectTo) ? originalRedirectTo : resolveRedirectTarget(null, request);
        if (!hasText(target)) {
            target = "/";
        }
        if (target.contains("?")) {
            return target + "&" + errorQuery;
        }
        return target + "?" + errorQuery;
    }

    private boolean isLocalHost(ServerHttpRequest request) {
        String host = request.getURI().getHost();
        if (hasText(host) && "localhost".equalsIgnoreCase(host)) {
            return true;
        }
        String hostHeader = request.getHeaders().getFirst(HttpHeaders.HOST);
        return hasText(hostHeader) && hostHeader.toLowerCase().startsWith("localhost");
    }
}


