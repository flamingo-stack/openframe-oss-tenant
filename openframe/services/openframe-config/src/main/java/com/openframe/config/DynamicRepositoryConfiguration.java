package com.openframe.config;

import io.micrometer.observation.ObservationRegistry;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.cloud.config.server.environment.CompositeEnvironmentRepository;
import org.springframework.cloud.config.server.environment.EnvironmentRepository;
import org.springframework.cloud.config.server.environment.JGitEnvironmentRepository;
import org.springframework.cloud.config.server.environment.MultipleJGitEnvironmentProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.core.env.ConfigurableEnvironment;

import java.util.ArrayList;
import java.util.List;

/**
 * Dynamic repository configuration for Spring Cloud Config Server.
 * Creates composite repositories based on environment variables.
 */
@Configuration
@ConditionalOnProperty(prefix = "openframe.config", name = "dynamic-repos",
        havingValue = "true", matchIfMissing = true)
@Slf4j
public class DynamicRepositoryConfiguration {

    /**
     * Primary repository name.
     */
    @Value("${openframe.config.git-repo-0}")
    private String repo0Name;

    /**
     * Primary repository branch.
     */
    @Value("${openframe.config.git-branch-0}")
    private String repo0Branch;

    /** Secondary repository name from environment variable. */
    @Value("${openframe.config.git-repo-1}")
    private String repo1Name;

    /** Secondary repository branch from environment variable. */
    @Value("${openframe.config.git-branch-1}")
    private String repo1Branch;

    /**
     * GitHub token.
     */
    @Value("${openframe.config.password}")
    private String password;

    /** Base GitHub organization URL. */
    @Value("${openframe.config.git-repo-base-url}")
    private String githubBaseUrl;

    /**
     * Creates a composite environment repository with dynamic configuration.
     *
     * @param environment the configurable environment
     * @param observationRegistry the observation registry
     * @return configured composite environment repository
     */
    @Bean
    @Primary
    public CompositeEnvironmentRepository dynamicCompositeRepository(
            final ConfigurableEnvironment environment,
            final ObservationRegistry observationRegistry) {

        final List<EnvironmentRepository> repositories = new ArrayList<>();
        String username = "username";

        // Add second repository first (higher priority)
        if (isValidRepoName(repo1Name)) {
            final MultipleJGitEnvironmentProperties props1 =
                createRepoProperties(
                        githubBaseUrl + repo1Name,
                        repo1Branch, 0, username, password
                );
            final JGitEnvironmentRepository repo1 =
                new JGitEnvironmentRepository(
                    environment, props1, observationRegistry
                );
            repositories.add(repo1);
            log.info("Added secondary repository (high priority): {} with branch: {}",
                    repo1Name, repo1Branch);
        } else {
            log.info("Secondary repository not configured"
                    + " (CONFIG_GIT_REPO_1 is empty or invalid): '{}'",
                    repo1Name);
        }

        // Add first repository second (lower priority)
        if (isValidRepoName(repo0Name)) {
            final MultipleJGitEnvironmentProperties props0 =
                createRepoProperties(
                        githubBaseUrl + repo0Name,
                        repo0Branch, 1, username, password
                );
            final JGitEnvironmentRepository repo0 =
                new JGitEnvironmentRepository(
                    environment, props0, observationRegistry
                );
            repositories.add(repo0);
            log.info("Added primary repository (low priority): {} with branch: {}",
                    repo0Name, repo0Branch);
        } else {
            log.warn("Primary repository not configured properly"
                    + " (CONFIG_GIT_REPO_0): {}", repo0Name);
        }

        final CompositeEnvironmentRepository composite =
            new CompositeEnvironmentRepository(
                repositories, observationRegistry, false);

        log.info("Configured composite repository with {} repositories",
                repositories.size());
        return composite;
    }

    /**
     * Validates if repository name is valid.
     *
     * @param repoName the repository name to validate
     * @return true if valid, false otherwise
     */
    private boolean isValidRepoName(final String repoName) {
        return repoName != null
               && !repoName.trim().isEmpty()
               && !repoName.equals(":")
               && !repoName.equals("null");
    }

    /**
     * Creates JGit environment repository properties.
     *
     * @param uri the repository URI
     * @param branch the repository branch
     * @param order the repository order
     * @param githubActor the GitHub actor for authentication
     * @param githubToken the GitHub token for authentication
     * @return configured properties
     */
    private MultipleJGitEnvironmentProperties createRepoProperties(
            final String uri, final String branch, final int order,
            final String githubActor, final String githubToken) {
        final MultipleJGitEnvironmentProperties props =
                new MultipleJGitEnvironmentProperties();
        props.setUri(uri);
        props.setDefaultLabel(branch);
        props.setCloneOnStart(true);
        props.setOrder(order);

        if (githubToken != null && !githubToken.isEmpty()) {
            props.setUsername(githubActor);
            log.debug("Set GitHub username for repository order {}: {}",
                    order, githubActor);

            props.setPassword(githubToken);
            log.debug("Set GitHub token for repository order {}", order);
        }

        return props;
    }
}
