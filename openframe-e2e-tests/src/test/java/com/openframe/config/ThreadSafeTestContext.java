package com.openframe.config;

import lombok.extern.slf4j.Slf4j;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Slf4j
public class ThreadSafeTestContext {
    
    private static final ThreadLocal<Map<String, Object>> THREAD_DATA = 
            ThreadLocal.withInitial(ConcurrentHashMap::new);
    
    private static final AtomicLong COUNTER = new AtomicLong(System.currentTimeMillis());
    
    public static void setData(String key, Object value) {
        THREAD_DATA.get().put(key, value);
    }

    public static <T> T getData(String key) {
        return (T) THREAD_DATA.get().get(key);
    }
    
    public static long generateUniqueId() {
        return COUNTER.incrementAndGet();
    }
    
    public static void createUniqueUser(String prefix) {
        String username = prefix + "_" + generateUniqueId();
        setData(CURRENT_USER, username);
        log.info("[{}] Created unique user: {}", Thread.currentThread().getName(), username);
    }
    
    public static void cleanup() {
        THREAD_DATA.remove();
    }
    
    public static final String CURRENT_USER = "current_user";
    public static final String PLAYER_ID = "player_id";
    public static final String RESPONSE_STATUS = "response_status";
    public static final String MONGO_CONNECTION = "mongo_connection";
} 