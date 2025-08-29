package com.openframe.core;

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
    
    @SuppressWarnings("unchecked")
    public static <T> T getData(String key) {
        return (T) THREAD_DATA.get().get(key);
    }
    
    public static long generateUniqueId() {
        return COUNTER.incrementAndGet();
    }
    
    public static String createUniqueUser(String prefix) {
        String username = prefix + "_" + generateUniqueId();
        setData(CURRENT_USER, username);
        log.info("[{}] Created unique user: {}", Thread.currentThread().getName(), username);
        return username;
    }
    
    public static void cleanup() {
        THREAD_DATA.remove();
    }
    
    public static final String CURRENT_USER = "current_user";
    public static final String PLAYER_ID = "player_id";
    public static final String RESPONSE_STATUS = "response_status";
} 