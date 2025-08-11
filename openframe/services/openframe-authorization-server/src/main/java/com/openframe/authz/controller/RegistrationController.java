package com.openframe.authz.controller;

import com.openframe.authz.dto.UserRegistrationRequest;
import com.openframe.authz.service.RegistrationService;
import com.openframe.core.constants.HttpHeaders;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping(path = "/oauth", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
public class RegistrationController {

    private final RegistrationService registrationService;
    private final AuthenticationManager authenticationManager;

    @Value("${openframe.auth.client.id}")
    private String clientId;

    @PostMapping(path = "/register", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, String>> register(
            @Valid @RequestBody com.openframe.authz.dto.AutoRegistrationRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {
        var tenant = registrationService.registerUser(
                new UserRegistrationRequest(
                        request.getEmail(),
                        request.getFirstName(),
                        request.getLastName(),
                        request.getPassword(),
                        request.getTenantName(),
                        request.getTenantDomain()
                ), null);

        Authentication auth = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword()));
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(auth);
        SecurityContextHolder.setContext(context);
        new HttpSessionSecurityContextRepository().saveContext(context, httpRequest, httpResponse);

        String base = getBaseUrl(httpRequest);
        // Prefer resolved tenant from service, fallback to TenantContext
        String tenantId = tenant != null ? tenant.getId() : com.openframe.authz.tenant.TenantContext.getTenantId();
        if (tenantId == null || tenantId.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "tenant_missing"));
        }
        String authorize = base + "/" + tenantId + "/oauth2/authorize" +
                "?response_type=code" +
                "&client_id=" + url(clientId) +
                "&redirect_uri=" + url(request.getRedirectUri()) +
                "&scope=" + url("openid profile email offline_access") +
                "&code_challenge=" + url(request.getPkceChallenge()) +
                "&code_challenge_method=S256";

        Map<String, String> body = new HashMap<>();
        body.put("redirect_url", authorize);
        return ResponseEntity.ok(body);
    }


    private static String getBaseUrl(HttpServletRequest req) {
        String proto = nvl(req.getHeader(HttpHeaders.X_FORWARDED_PROTO), req.getScheme());
        String host = nvl(req.getHeader(HttpHeaders.X_FORWARDED_HOST), req.getServerName());
        String port = nvl(req.getHeader(HttpHeaders.X_FORWARDED_PORT),
                (req.getServerPort() == 80 || req.getServerPort() == 443) ? "" : ":" + req.getServerPort());
        return proto + "://" + host + (host.contains(":") || port.isEmpty() ? "" : port);
    }

    private static String url(String v) {
        return URLEncoder.encode(v, StandardCharsets.UTF_8);
    }

    private static String nvl(String a, String b) {
        return (a == null || a.isBlank()) ? b : a;
    }
}


