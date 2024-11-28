package com.openframe.api.config;

import org.apache.pinot.client.Connection;
import org.apache.pinot.client.ConnectionFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class PinotConfig {

    @Value("${pinot.controller.url}")
    private String controllerUrl;

    @Bean
    public Connection pinotConnection() {
        return ConnectionFactory.fromHostList(controllerUrl);
    }
}
