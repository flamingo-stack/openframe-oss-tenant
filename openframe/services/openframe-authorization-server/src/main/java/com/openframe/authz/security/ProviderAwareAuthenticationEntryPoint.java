package com.openframe.authz.security;

import com.openframe.authz.tenant.TenantContext;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;

import java.io.IOException;

public class ProviderAwareAuthenticationEntryPoint implements AuthenticationEntryPoint {

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response, AuthenticationException authException) throws IOException {
        String provider = request.getParameter("provider");

        // Preserve tenant in session for dynamic ClientRegistration resolution
        String tenantId = TenantContext.getTenantId();
        if (tenantId != null && !tenantId.isBlank()) {
            HttpSession session = request.getSession(true);
            session.setAttribute("TENANT_ID", tenantId);
        }

        String target = "/login";
        if (provider != null && provider.equalsIgnoreCase("google")) {
            target = "/oauth2/authorization/google";
        }

        response.sendRedirect(request.getContextPath() + target);
    }
}


