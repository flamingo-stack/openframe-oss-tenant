package com.openframe.authz;

import com.openframe.authz.config.CorsProperties;
import com.openframe.security.config.JwtSecurityConfig;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;

@SpringBootApplication
@EnableDiscoveryClient
@EnableConfigurationProperties({CorsProperties.class})
@ComponentScan(
    basePackages = {"com.openframe.authz", "com.openframe.core", "com.openframe.security"},
    excludeFilters = @ComponentScan.Filter(
        type = FilterType.ASSIGNABLE_TYPE,
        classes = {JwtSecurityConfig.class}
    )
)
public class OpenFrameAuthorizationServerApplication {

    public static void main(String[] args) {
        SpringApplication.run(OpenFrameAuthorizationServerApplication.class, args);
    }
} 