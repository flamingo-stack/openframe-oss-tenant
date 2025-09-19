package com.openframe.config.properties;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Configuration properties for dynamic Git repositories.
 */
@ConfigurationProperties(prefix = "openframe.config.git")
@Component
@Data
public final class DynamicGitRepositoryProperties {

    /** List of configured Git repositories. */
    private List<GitRepository> repositories = new ArrayList<>();

    /**
     * Configuration for a single Git repository.
     */
    @Data
    public static final class GitRepository {
        /** Repository name. */
        private String name;
        /** Repository URI. */
        private String uri;
        /** Repository branch. */
        private String branch = "main";
        /** Username for authentication. */
        private String username;
        /** Password for authentication. */
        private String password;
        /** Repository order. */
        private Integer order;
        /** Whether to clone on start. */
        private boolean cloneOnStart = true;
        /** Search path. */
        private String searchPath;
    }
}
