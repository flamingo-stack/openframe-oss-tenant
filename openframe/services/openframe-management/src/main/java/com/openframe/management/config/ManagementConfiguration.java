package com.openframe.management.config;

import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.FilterType;

import com.openframe.data.health.CassandraHealthIndicator;

@Configuration
@ComponentScan(
    basePackages = "com.openframe",
    excludeFilters = {
        @ComponentScan.Filter(
            type = FilterType.ASSIGNABLE_TYPE,
            classes = CassandraHealthIndicator.class
        )
    }
)
public class ManagementConfiguration {
} 