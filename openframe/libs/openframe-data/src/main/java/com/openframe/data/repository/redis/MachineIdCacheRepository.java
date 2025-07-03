package com.openframe.data.repository.redis;

import com.openframe.data.model.redis.MachineIdCacheEntry;
import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Spring Data Redis repository for machine ID cache operations
 */
@Repository
public interface MachineIdCacheRepository extends CrudRepository<MachineIdCacheEntry, String> {
} 