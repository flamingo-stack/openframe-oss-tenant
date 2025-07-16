package com.openframe.stream.repository.fleet;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "hosts")
@Data
public class FleetHost {
    
    @Id
    @Column(name = "id")
    private String id;
    
    @Column(name = "uuid")
    private String uuid; // This is the agent_id
} 