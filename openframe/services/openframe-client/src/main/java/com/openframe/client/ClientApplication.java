package com.openframe.client;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.data.mongo.MongoReactiveDataAutoConfiguration;
import org.springframework.boot.autoconfigure.mongo.MongoReactiveAutoConfiguration;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import com.openframe.data.cassandra.health.CassandraHealthIndicator;

@SpringBootApplication(exclude = {MongoReactiveAutoConfiguration.class, MongoReactiveDataAutoConfiguration.class})
@ComponentScan(
    basePackages = {
            "com.openframe.data",
            "com.openframe.client",
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