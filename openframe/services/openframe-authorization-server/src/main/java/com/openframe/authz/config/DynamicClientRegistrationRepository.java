package com.openframe.authz.config;

import com.openframe.authz.service.DynamicClientRegistrationService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import static com.openframe.authz.config.GoogleSSOProperties.GOOGLE;

@Component
@RequiredArgsConstructor
@Slf4j
public class DynamicClientRegistrationRepository implements ClientRegistrationRepository {

    private static final String TENANT_ID = "TENANT_ID";

    private final DynamicClientRegistrationService dynamic;

    @Override
    public ClientRegistration findByRegistrationId(String registrationId) {
        if (!GOOGLE.equalsIgnoreCase(registrationId)) {
            return null;
        }
        String tenantId = resolveTenantIdFromSession();
        if (tenantId == null) {
            log.debug("Skipping dynamic client load: tenantId not found in session");
            return null;
        }
        try {
            return dynamic.loadGoogleClient(tenantId);
        } catch (IllegalArgumentException ex) {
            log.warn("No active Google SSO config for tenant {}: {}", tenantId, ex.getMessage());
            return null;
        }
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
        Object t = session.getAttribute(TENANT_ID);
        String tenantId = t instanceof String s ? s : null;
        return (tenantId == null || tenantId.isBlank()) ? null : tenantId;
    }
}


