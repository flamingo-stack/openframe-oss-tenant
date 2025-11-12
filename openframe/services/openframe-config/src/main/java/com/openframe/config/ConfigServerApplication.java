package com.openframe.config;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import lombok.extern.slf4j.Slf4j;

@SpringBootApplication
@Slf4j
public class ConfigServerApplication { 
 
    public static void main(String[] args) {
        SpringApplication.run(ConfigServerApplication.class, args);
    }
}
