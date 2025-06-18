package com.openframe.api.service;

import com.openframe.api.dto.*;
import com.openframe.api.service.social.SocialAuthStrategy;
import com.openframe.core.model.SSOConfig;
import com.openframe.core.service.EncryptionService;
import com.openframe.data.repository.mongo.SSOConfigRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.validation.annotation.Validated;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Validated
public class SSOConfigService {
    private final SSOConfigRepository ssoConfigRepository;
    private final EncryptionService encryptionService;
    private final List<SocialAuthStrategy> authStrategies;


    /**
     * Get list of enabled SSO providers - used by login components
     */
    public List<SSOConfigStatusResponse> getEnabledProviders() {
        log.debug("Getting enabled SSO providers");

        return ssoConfigRepository.findByEnabledTrue().stream()
                .map(config -> SSOConfigStatusResponse.builder()
                        .provider(config.getProvider())
                        .enabled(true)
                        .clientId(config.getClientId())
                        .build())
                .collect(Collectors.toList());
    }

    /**
     * Get list of available SSO providers from strategies - used by admin dropdowns
     */
    public List<SSOProviderInfo> getAvailableProviders() {
        log.debug("Getting available SSO providers from strategies");

        return authStrategies.stream()
                .map(strategy -> {
                    SSOProvider provider = strategy.getProvider();
                    return SSOProviderInfo.builder()
                            .provider(provider.getProvider())
                            .displayName(provider.getDisplayName())
                    .build();
                })
                .collect(Collectors.toList());
    }

    /**
     * Get full SSO configuration for admin forms
     * Returns complete configuration data including decrypted client secret for editing
     * Always returns a valid response object, even if configuration doesn't exist
     */
    public SSOConfigResponse getConfig(String provider) {
        return ssoConfigRepository.findByProvider(provider)
                .map(config -> SSOConfigResponse.builder()
                        .id(config.getId())
                        .provider(config.getProvider())
                        .clientId(config.getClientId())
                        .clientSecret(encryptionService.decryptClientSecret(config.getClientSecret()))
                        .enabled(config.isEnabled())
                        .build())
                .orElse(SSOConfigResponse.builder()
                        .id(null)
                        .provider(provider)
                        .clientId(null)
                        .clientSecret(null)
                        .enabled(false)
                        .build());
    }

    public SSOConfigResponse saveConfig(String provider, @Valid SSOConfigRequest request) {
        Optional<SSOConfig> existingConfig = ssoConfigRepository.findByProvider(provider);
        if (existingConfig.isPresent()) {
            log.warn("SSO configuration for provider '{}' already exists. Use update method instead.", provider);
            return updateConfig(provider, request);
        }

        SSOConfig config = new SSOConfig();
        config.setProvider(provider);
        config.setClientId(request.getClientId());
        config.setClientSecret(encryptionService.encryptClientSecret(request.getClientSecret()));
        config.setEnabled(true);

        SSOConfig savedConfig = ssoConfigRepository.save(config);
        log.info("Successfully created SSO configuration for provider '{}'", provider);

        return SSOConfigResponse.builder()
                .id(savedConfig.getId())
                .provider(savedConfig.getProvider())
                .clientId(savedConfig.getClientId())
                .clientSecret(request.getClientSecret())
                .enabled(savedConfig.isEnabled())
                .build();
    }

    public void deleteConfig(String provider) {
        ssoConfigRepository.findByProvider(provider)
                .ifPresent(config -> {
                    ssoConfigRepository.delete(config);
                    log.info("Successfully deleted SSO configuration for provider '{}'", provider);
                });
    }

    public SSOConfigResponse updateConfig(String provider, @Valid SSOConfigRequest request) {
        return ssoConfigRepository.findByProvider(provider)
                .map(existingConfig -> {
                    existingConfig.setClientId(request.getClientId());
                    existingConfig.setClientSecret(encryptionService.encryptClientSecret(request.getClientSecret()));
                    SSOConfig savedConfig = ssoConfigRepository.save(existingConfig);
                    log.info("Successfully updated SSO configuration for provider '{}'", provider);

                    return SSOConfigResponse.builder()
                            .id(savedConfig.getId())
                            .provider(savedConfig.getProvider())
                            .clientId(savedConfig.getClientId())
                            .clientSecret(request.getClientSecret())
                            .enabled(savedConfig.isEnabled())
                            .build();
                })
                .orElseGet(() -> {
                    log.info("SSO configuration for provider '{}' not found. Creating new one.", provider);
                    return saveConfig(provider, request);
                });
    }

    public void toggleEnabled(String provider, boolean enabled) {
        ssoConfigRepository.findByProvider(provider)
                .ifPresent(config -> {
                    config.setEnabled(enabled);
                    ssoConfigRepository.save(config);
                    log.info("Successfully {} SSO configuration for provider '{}'",
                            enabled ? "enabled" : "disabled", provider);
                });
    }
} 