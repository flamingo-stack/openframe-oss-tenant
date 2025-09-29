package com.openframe.client;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.kafka.annotation.EnableKafka;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import com.openframe.data.health.CassandraHealthIndicator;

@SpringBootApplication
@ComponentScan(
    basePackages = {
            "com.openframe.client",
            "com.openframe.data",
            "com.openframe.core",
            "com.openframe.security",
            "com.openframe.kafka.producer",
    },
    excludeFilters = {
        @ComponentScan.Filter(
            type = FilterType.ASSIGNABLE_TYPE,
            classes = CassandraHealthIndicator.class
        )
    }
)
public class ClientApplication {
    public static void main(String[] args) {
        SpringApplication.run(ClientApplication.class, args);
    }
} 