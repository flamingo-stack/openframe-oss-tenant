package com.openframe.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.kafka.annotation.EnableKafka;

@SpringBootApplication
@EnableKafka
@ComponentScan(basePackages = {"com.openframe.api", "com.openframe.data", "com.openframe.core", "com.openframe.security"})
public class ApiApplication {

    public static void main(String[] args) {
        SpringApplication.run(ApiApplication.class, args);
    }
}