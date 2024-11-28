package com.openframe.api.configuration;

import org.apache.pinot.client.Connection;
import org.apache.pinot.client.ConnectionFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import java.util.Properties;

@Configuration
public class PinotConfig {
    @Value("${pinot.controller.url}")
    private String controllerUrl;

    @Bean
    public Connection pinotConnection() {
        Properties properties = new Properties();
        properties.setProperty("controller.url", controllerUrl);
        return ConnectionFactory.fromProperties(properties);
    }
}
