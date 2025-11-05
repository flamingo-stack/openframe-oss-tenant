package com.openframe.gateway.security.tenant;

import com.openframe.data.reactive.repository.tenant.ReactiveTenantRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

@Component
@Slf4j
public class IssuerUrlProvider {

    private final ReactiveTenantRepository tenantRepository;

    @Value("${openframe.security.jwt.allowed-issuer-base}")
    private String allowedIssuerBase;

    @Value("${openframe.security.jwt.super-tenant-id:}")
    private String superTenantId;

    private final AtomicReference<Mono<List<String>>> ref = new AtomicReference<>();
    private volatile List<String> cachedIssuers;

    public IssuerUrlProvider(ReactiveTenantRepository tenantRepository) {
        this.tenantRepository = tenantRepository;
    }

    public Mono<List<String>> resolveIssuerUrls() {
        Mono<List<String>> cached = ref.get();
        if (cached != null) return cached;

        Mono<List<String>> created = tenantRepository.findAll().next()
                .switchIfEmpty(Mono.error(new IllegalStateException("No tenants found")))
                .map(t -> {
                    String dbIssuer = allowedIssuerBase + "/" + t.getId();
                    List<String> list = new ArrayList<>(2);
                    list.add(dbIssuer);
                    if (superTenantId != null && !superTenantId.isBlank()) {
                        String superIssuer = allowedIssuerBase + "/" + superTenantId;
                        if (!superIssuer.equals(dbIssuer)) {
                            list.add(superIssuer);
                        }
                    }
                    return Collections.unmodifiableList(list);
                })
                .doOnNext(list -> this.cachedIssuers = list)
                .cache();

        if (ref.compareAndSet(null, created)) {
            return created.onErrorResume(e -> {
                ref.compareAndSet(created, null);
                return Mono.error(e);
            });
        } else {
            return ref.get();
        }
    }

    public List<String> getCachedIssuerUrl() {
        if (cachedIssuers == null || cachedIssuers.isEmpty()) {
            resolveIssuerUrls().subscribe();
        }
        return cachedIssuers != null ? cachedIssuers : Collections.emptyList();
    }
}


