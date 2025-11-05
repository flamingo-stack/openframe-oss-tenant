package com.openframe.gateway.security.tenant;

import com.openframe.data.reactive.repository.tenant.ReactiveTenantRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

import java.util.concurrent.atomic.AtomicReference;

@Component
@Slf4j
public class IssuerUrlProvider {

    private final ReactiveTenantRepository tenantRepository;

    @Value("${openframe.security.jwt.allowed-issuer-base}")
    private String allowedIssuerBase;

    private final AtomicReference<Mono<String>> ref = new AtomicReference<>();
    private volatile String cachedIssuer;

    public IssuerUrlProvider(ReactiveTenantRepository tenantRepository) {
        this.tenantRepository = tenantRepository;
    }

    public Mono<String> resolveIssuerUrl() {
        Mono<String> cached = ref.get();
        if (cached != null) return cached;

        Mono<String> created = tenantRepository.findAll().next()
                .switchIfEmpty(Mono.error(new IllegalStateException("No tenants found")))
                .map(t -> allowedIssuerBase + "/" + t.getId())
                .doOnNext(url -> this.cachedIssuer = url)
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

    public String getCachedIssuerUrl() {
        if (cachedIssuer == null) {
            // non-blocking warm-up
            resolveIssuerUrl().subscribe();
        }
        return cachedIssuer;
    }
}


