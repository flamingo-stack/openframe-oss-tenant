package com.openframe.authz.tenant;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Component;

@Component
public class IssuerResolver {
    public String resolve(HttpServletRequest request) {
        String proto = headerOr(request, "X-Forwarded-Proto", request.getScheme());
        String host = headerOr(request, "X-Forwarded-Host", request.getServerName());
        String port = headerOr(request, "X-Forwarded-Port",
                (request.getServerPort() == 80 || request.getServerPort() == 443) ? "" : ":" + request.getServerPort());
        String tenantId = TenantContext.getTenantId();
        String base = proto + "://" + host + (host.contains(":") || port.isEmpty() ? "" : port);
        if (tenantId != null && !tenantId.isBlank()) {
            return base + "/" + tenantId;
        }
        return base;
    }

    private String headerOr(HttpServletRequest req, String name, String def) {
        String v = req.getHeader(name);
        return (v == null || v.isBlank()) ? def : v;
    }
}


