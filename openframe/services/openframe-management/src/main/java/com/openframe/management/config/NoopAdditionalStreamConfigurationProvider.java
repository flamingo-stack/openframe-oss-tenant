package com.openframe.management.config;

import com.openframe.management.initializer.AdditionalStreamConfigurationProvider;
import io.nats.client.api.StreamConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

/**
 * OSS-mode stub for the required {@code AdditionalStreamConfigurationProvider}
 * dependency (openframe-management-service-core 6.21.1, package
 * {@code com.openframe.management.initializer}).
 *
 * {@code NatsStreamConfigurationInitializer} takes the provider as a required
 * constructor parameter with no default and no {@code @ConditionalOnMissingBean}
 * fallback, so without an implementation the OSS management service fails to
 * start ("APPLICATION FAILED TO START ... required a bean of type
 * 'AdditionalStreamConfigurationProvider'") and the whole tenant chain stays
 * on its wait-for-management init containers. The OSS deployment has no
 * additional (tenant-provisioned) NATS streams, so an empty list is the
 * correct answer, not a workaround.
 *
 * Note: the 6.20.x incarnation of the same gap needed a
 * {@code TenantAdditionalStreamConfigurationProvider} in a different package —
 * the SPI moved in 6.21.x; keep this stub in sync when bumping the libs.
 */
@Configuration
public class NoopAdditionalStreamConfigurationProvider {

    @Bean
    public AdditionalStreamConfigurationProvider additionalStreamConfigurationProvider() {
        return List::of;
    }
}
