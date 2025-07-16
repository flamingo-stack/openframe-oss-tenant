package com.openframe.stream.repository.fleet;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FleetHostRepository extends JpaRepository<FleetHost, String> {
    // Basic CRUD operations are provided by JpaRepository
    // findById(String id) - to get host by ID and extract uuid (agent_id)
} 