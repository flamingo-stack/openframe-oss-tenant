package com.openframe.authz.config;

import com.openframe.authz.service.DynamicClientRegistrationService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Configuration
public class OAuth2ClientDynamicConfig {

    @Bean
    public ClientRegistrationRepository clientRegistrationRepository(DynamicClientRegistrationService dynamic) {
        return registrationId -> {
            if (!"google".equalsIgnoreCase(registrationId)) {
                return null;
            }
            String tenantId = resolveTenantIdFromSession();
            return tenantId == null ? null : dynamic.loadGoogleClient(tenantId);
        };
    }

    private String resolveTenantIdFromSession() {
        RequestAttributes ra = RequestContextHolder.getRequestAttributes();
        if (!(ra instanceof ServletRequestAttributes sra)) {
            return null;
        }
        HttpServletRequest req = sra.getRequest();
        HttpSession session = req.getSession(false);
        if (session == null) {
            return null;
        }
        Object t = session.getAttribute("TENANT_ID");
        String tenantId = t instanceof String s ? s : null;
        return (tenantId == null || tenantId.isBlank()) ? null : tenantId;
    }
}


