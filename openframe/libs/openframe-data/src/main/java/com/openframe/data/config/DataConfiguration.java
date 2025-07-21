package com.openframe.data.config;

import com.mongodb.reactivestreams.client.MongoClient;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.cassandra.repository.config.EnableCassandraRepositories;
import org.springframework.data.mongodb.MongoDatabaseFactory;
import org.springframework.data.mongodb.core.ReactiveMongoTemplate;
import org.springframework.data.mongodb.core.convert.DefaultDbRefResolver;
import org.springframework.data.mongodb.core.convert.DbRefResolver;
import org.springframework.data.mongodb.core.convert.MappingMongoConverter;
import org.springframework.data.mongodb.core.convert.MongoCustomConversions;
import org.springframework.data.mongodb.core.mapping.MongoMappingContext;
import org.springframework.data.mongodb.repository.config.EnableMongoRepositories;
import org.springframework.data.mongodb.repository.config.EnableReactiveMongoRepositories;
import org.springframework.kafka.annotation.EnableKafka;

@Configuration
public class DataConfiguration {

    @Configuration
    @ConditionalOnProperty(name = "spring.data.mongodb.enabled", havingValue = "true", matchIfMissing = false)
    @EnableMongoRepositories(basePackages = "com.openframe.data.repository.mongo")
    public static class MongoConfiguration {

        @Bean
        public MappingMongoConverter mappingMongoConverter(MongoDatabaseFactory factory,
                                                           MongoMappingContext context,
                                                           MongoCustomConversions conversions) {
            DbRefResolver dbRefResolver = new DefaultDbRefResolver(factory);
            MappingMongoConverter converter = new MappingMongoConverter(dbRefResolver, context);
            converter.setCustomConversions(conversions);
            converter.setMapKeyDotReplacement("__dot__");
            return converter;
        }
    }

    @Configuration
    @ConditionalOnProperty(name = "spring.data.cassandra.enabled", havingValue = "true", matchIfMissing = false)
    @EnableCassandraRepositories(basePackages = "com.openframe.data.repository.cassandra")
    public static class CassandraConfiguration {}

    @Configuration
    @ConditionalOnProperty(name = "spring.kafka.enabled", havingValue = "true", matchIfMissing = false)
    @EnableKafka
    public static class KafkaConfiguration {}
}