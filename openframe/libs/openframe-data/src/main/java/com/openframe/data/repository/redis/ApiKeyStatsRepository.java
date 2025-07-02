package com.openframe.data.repository.redis;

import com.openframe.data.model.redis.ApiKeyStats;
import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ApiKeyStatsRepository extends CrudRepository<ApiKeyStats, String> {
} 