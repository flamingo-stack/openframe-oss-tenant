package com.openframe.authz.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.config.EnableMongoAuditing;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.convert.MongoCustomConversions;
import org.springframework.data.mongodb.repository.config.EnableMongoRepositories;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.ZonedDateTime;
import java.util.Arrays;
import java.util.Date;

@Configuration
@EnableMongoRepositories(basePackages = "com.openframe.authz.repository")
@EnableMongoAuditing
public class MongoConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    @Bean
    public MongoCustomConversions customConversions() {
        return new MongoCustomConversions(Arrays.asList(
                new ZonedDateTimeReadConverter(),
                new ZonedDateTimeWriteConverter()
        ));
    }

    // Convert ZonedDateTime to Date for MongoDB storage
    public static class ZonedDateTimeWriteConverter implements org.springframework.core.convert.converter.Converter<ZonedDateTime, Date> {
        @Override
        public Date convert(ZonedDateTime source) {
            return Date.from(source.toInstant());
        }
    }

    // Convert Date from MongoDB to ZonedDateTime
    public static class ZonedDateTimeReadConverter implements org.springframework.core.convert.converter.Converter<Date, ZonedDateTime> {
        @Override
        public ZonedDateTime convert(Date source) {
            return source.toInstant().atZone(java.time.ZoneOffset.UTC);
        }
    }
} 