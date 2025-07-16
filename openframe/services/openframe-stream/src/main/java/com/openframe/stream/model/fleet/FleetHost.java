package com.openframe.stream.model.fleet;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

/**
 * Simple model for Fleet hosts table containing only required fields
 * Used for agent_id resolution in stream processing
 */
@Entity
@Table(name = "hosts")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class FleetHost {

    @Id
    @Column(name = "id")
    private Long id;

    @Column(name = "uuid")
    private String uuid; // This is the agent_id
} 