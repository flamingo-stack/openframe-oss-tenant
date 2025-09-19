package com.openframe.data;

import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

public class TestDataGenerator {
    
    public static String generateMacAddress() {
        return String.format("02:%02x:%02x:%02x:%02x:%02x",
            random(0, 255), random(0, 255), random(0, 255), 
            random(0, 255), random(0, 255));
    }
    
    public static String generateAgentIP() {
        return String.format("192.168.1.%d", random(1, 254));
    }
    
    public static String generateCorrelationId(String testId) {
        return String.format("corr-%s", testId);
    }
    
    public static String generateShortUuid() {
        return UUID.randomUUID().toString().substring(0, 8);
    }
    
    private static int random(int min, int max) {
        return ThreadLocalRandom.current().nextInt(min, max + 1);
    }
}