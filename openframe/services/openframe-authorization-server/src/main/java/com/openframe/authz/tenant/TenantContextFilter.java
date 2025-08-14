package com.openframe.authz.tenant;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

import static org.springframework.core.Ordered.HIGHEST_PRECEDENCE;

@Component
@Order(HIGHEST_PRECEDENCE + 10)
public class TenantContextFilter extends OncePerRequestFilter {
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        try {
            // Resolve tenantId in order:
            // 1) from path after servlet context-path (e.g., "/sas/{tenantId}/..." → "/{tenantId}/...")
            String tenantId = null;
            String requestUri = request.getRequestURI();
            String contextPath = request.getContextPath(); // e.g., "/sas" or ""
            String appPath;
            if (requestUri == null) {
                appPath = "/";
            } else if (contextPath != null && !contextPath.isEmpty() && requestUri.startsWith(contextPath)) {
                appPath = requestUri.substring(contextPath.length());
                if (appPath.isEmpty()) appPath = "/";
            } else {
                appPath = requestUri;
            }

            if (appPath != null && appPath.length() > 1) {
                String[] parts = appPath.split("/", 3); // ["", maybeTenant, rest]
                if (parts.length >= 3) {
                    String maybeTenant = parts[1];
                    String rest = "/" + parts[2];
                    // Recognize tenant only for SAS endpoints
                    if (!maybeTenant.isBlank() && (rest.startsWith("/oauth2/")
                            || rest.startsWith("/.well-known/")
                            || rest.startsWith("/connect/")
                            || rest.equals("/login")
                            || rest.equals("/userinfo"))) {
                        tenantId = maybeTenant;
                    }
                }
            }
            // 2) query param ?tenant=
            if (tenantId == null || tenantId.equals(".well-known")) {
                String qp = request.getParameter("tenant");
                if (qp != null && !qp.isBlank()) tenantId = qp;
            }
            // 3) session attribute (for non-prefixed endpoints like /oauth2/token)
            if (tenantId == null || tenantId.equals(".well-known")) {
                Object sess = request.getSession(false) != null ? request.getSession(false).getAttribute("TENANT_ID") : null;
                if (sess instanceof String s && !s.isBlank()) {
                    tenantId = s;
                }
            }

            if (tenantId != null && !tenantId.equals(".well-known")) {
                TenantContext.setTenantId(tenantId);
                // persist in session for later non-prefixed endpoints
                request.getSession(true).setAttribute("TENANT_ID", tenantId);
            }
            filterChain.doFilter(request, response);
        } finally {
            TenantContext.clear();
        }
    }
}


