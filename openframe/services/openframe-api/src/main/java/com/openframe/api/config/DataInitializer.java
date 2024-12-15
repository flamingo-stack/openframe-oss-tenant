package com.openframe.api.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;

import com.openframe.core.model.OAuthClient;
import com.openframe.data.repository.OAuthClientRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Configuration
@RequiredArgsConstructor
public class DataInitializer {

    private final Environment env;

    @Bean
    CommandLineRunner initOAuthClients(OAuthClientRepository clientRepository) {
        return args -> {
            String clientId = env.getProperty("oauth.client.default.id");
            String clientSecret = env.getProperty("oauth.client.default.secret");

            log.info("Initializing OAuth client - ID: {}", clientId);
            log.debug("Client secret length: {}", clientSecret != null ? clientSecret.length() : 0);

            OAuthClient existingClient = clientRepository.findByClientId(clientId);
            if (existingClient == null) {
                OAuthClient client = new OAuthClient();
                client.setClientId(clientId);
                client.setClientSecret(clientSecret);
                client.setGrantTypes(new String[]{"password", "refresh_token"});
                client.setScopes(new String[]{"read", "write"});
                
                clientRepository.save(client);
                log.info("Created OAuth client: {}", clientId);
            } else {
                if (!existingClient.getClientSecret().equals(clientSecret)) {
                    existingClient.setClientSecret(clientSecret);
                    clientRepository.save(existingClient);
                    log.info("Updated OAuth client secret: {}", clientId);
                } else {
                    log.info("OAuth client already exists with correct configuration: {}", clientId);
                }
            }
        };
    }
} 