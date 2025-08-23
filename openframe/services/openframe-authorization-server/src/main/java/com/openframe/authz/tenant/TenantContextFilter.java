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
            String tenantId = null;
            String appPath = getString(request);

            if (appPath.length() > 1) {
                String[] parts = appPath.split("/", 3); // ["", maybeTenant, rest]
                if (parts.length >= 3) {
                    String maybeTenant = parts[1];
                    String rest = "/" + parts[2];
                    if (!maybeTenant.isBlank() && (rest.startsWith("/oauth2/")
                            || rest.startsWith("/.well-known/")
                            || rest.startsWith("/connect/")
                            || rest.equals("/login")
                            || rest.equals("/userinfo"))) {
                        tenantId = maybeTenant;
                    }
                }
            }
            if (tenantId == null || tenantId.equals(".well-known")) {
                String qp = request.getParameter("tenant");
                if (qp != null && !qp.isBlank()) tenantId = qp;
            }
            if (tenantId == null || tenantId.equals(".well-known")) {
                Object sess = request.getSession(false) != null ? request.getSession(false).getAttribute("TENANT_ID") : null;
                if (sess instanceof String s && !s.isBlank()) {
                    tenantId = s;
                }
            }

            if (tenantId != null && !tenantId.equals(".well-known")) {
                TenantContext.setTenantId(tenantId);
                request.getSession(true).setAttribute("TENANT_ID", tenantId);
            }
            filterChain.doFilter(request, response);
        } finally {
            TenantContext.clear();
        }
    }

    private static String getString(HttpServletRequest request) {
        String requestUri = request.getRequestURI();
        String contextPath = request.getContextPath();
        String appPath;
        if (requestUri == null) {
            appPath = "/";
        } else if (contextPath != null && !contextPath.isEmpty() && requestUri.startsWith(contextPath)) {
            appPath = requestUri.substring(contextPath.length());
            if (appPath.isEmpty()) appPath = "/";
        } else {
            appPath = requestUri;
        }
        return appPath;
    }
}


