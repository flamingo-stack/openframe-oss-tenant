package com.openframe.gateway;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.scheduling.annotation.EnableScheduling;

import lombok.RequiredArgsConstructor;

@SpringBootApplication
// TODO: remove scheduling ?
@EnableScheduling
@ComponentScan(basePackages = {"com.openframe.gateway", "com.openframe.core", "com.openframe.data", "com.openframe.security"})
@RequiredArgsConstructor
public class GatewayApplication {

    public static void main(String[] args) {
        SpringApplication.run(GatewayApplication.class, args);
    }

}