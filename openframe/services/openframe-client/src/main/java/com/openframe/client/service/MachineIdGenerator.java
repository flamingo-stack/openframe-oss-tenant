package com.openframe.client.service;

import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class MachineIdGenerator {

    public String generate() {
        return UUID.randomUUID().toString();
    }

}
