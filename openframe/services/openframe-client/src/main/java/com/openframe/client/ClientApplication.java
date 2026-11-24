package com.openframe.client;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;

@SpringBootApplication
@ComponentScan(
    basePackages = {
            "com.openframe.data",
            "com.openframe.client",
            "com.openframe.core",
            "com.openframe.security",
            "com.openframe.kafka.producer",
    }
)
public class ClientApplication {
    public static void main(String[] args) {
        SpringApplication.run(ClientApplication.class, args);
    }
} 