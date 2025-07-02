package com.openframe.data.repository.redis;

import com.openframe.data.model.redis.RateLimit;
import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RateLimitRepository extends CrudRepository<RateLimit, String> {
} 