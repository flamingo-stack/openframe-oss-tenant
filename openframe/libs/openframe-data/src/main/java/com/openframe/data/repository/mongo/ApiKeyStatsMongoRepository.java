package com.openframe.data.repository.mongo;

import com.openframe.data.model.mongo.ApiKeyStats;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ApiKeyStatsMongoRepository extends MongoRepository<ApiKeyStats, String> {
} 