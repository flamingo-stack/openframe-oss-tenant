package com.openframe.authz;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;
import org.springframework.context.annotation.ComponentScan;

@SpringBootApplication
@EnableDiscoveryClient
@ComponentScan(
        basePackages = {
                "com.openframe.authz", "com.openframe.core", "com.openframe.data", "com.openframe.notification"
        }
)
public class OpenFrameAuthorizationServerApplication {

    public static void main(String[] args) {
        SpringApplication.run(OpenFrameAuthorizationServerApplication.class, args);
    }
} 