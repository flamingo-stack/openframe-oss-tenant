package com.openframe.authz.service;

import com.openframe.authz.config.GoogleSSOProperties;
import com.openframe.data.document.sso.SSOConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.ClientAuthenticationMethod;
import org.springframework.security.oauth2.core.oidc.IdTokenClaimNames;
import org.springframework.stereotype.Service;

import java.util.Arrays;

@Service
@RequiredArgsConstructor
@Slf4j
public class DynamicClientRegistrationService {

    private final SSOConfigService ssoConfigService;
    private final GoogleSSOProperties googleProps;

    @Value("${openframe.tenancy.local-tenant:false}")
    private boolean localTenant;

    public ClientRegistration loadGoogleClient(String tenantId) {
        SSOConfig cfg = localTenant
                ? ssoConfigService.getActiveByProvider("google").stream().findFirst().orElseThrow(() -> new IllegalArgumentException("No active Google config for tenant " + tenantId))
                : ssoConfigService.getSSOConfig(tenantId, "google").orElseThrow(() -> new IllegalArgumentException("No active Google config for tenant " + tenantId));


        return ClientRegistration.withRegistrationId("google")
                .clientId(cfg.getClientId())
                .clientSecret(ssoConfigService.getDecryptedClientSecret(cfg))
                .clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_BASIC)
                .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                .redirectUri(googleProps.getLoginRedirectUri())
                .scope(Arrays.stream(defaultString(googleProps.getScopes()).split(","))
                        .map(String::trim)
                        .filter(s -> !s.isBlank())
                        .toArray(String[]::new))
                .authorizationUri(googleProps.getAuthorizationUrl())
                .tokenUri(googleProps.getTokenUrl())
                .userInfoUri(googleProps.getUserInfoUrl())
                .userNameAttributeName(IdTokenClaimNames.SUB)
                .jwkSetUri(googleProps.getJwkSetUri())
                .clientName("Google (" + tenantId + ")")
                .build();
    }

    private static String defaultString(String value) {
        return (value == null || value.isBlank()) ? "openid,profile,email" : value;
    }
}


