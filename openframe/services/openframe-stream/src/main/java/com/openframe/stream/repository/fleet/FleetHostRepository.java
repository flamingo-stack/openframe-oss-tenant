package com.openframe.stream.repository.fleet;

import com.openframe.stream.model.fleet.FleetHost;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Repository for Fleet MySQL database operations
 * Used to retrieve FleetHost by ID for activity enrichment
 */
@Repository
public interface FleetHostRepository extends JpaRepository<FleetHost, Integer> {
} 