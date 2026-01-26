package com.openframe.config;

import lombok.extern.slf4j.Slf4j;

@Slf4j
public class RedisConfig {

    private static final String DEFAULT_REDIS_URI = "redis://redis-master.datasources.svc.cluster.local:6379";

    private static String redisUri;

    public static String getRedisUri() {
        if (redisUri == null) {
            String cmdVar = System.getProperty("redis.uri");
            String envVar = System.getenv("REDIS_URI");
            if (cmdVar != null && !cmdVar.trim().isEmpty()) {
                redisUri = cmdVar;
            } else if (envVar != null && !envVar.trim().isEmpty()) {
                redisUri = envVar;
            } else {
                redisUri = DEFAULT_REDIS_URI;
            }
            log.debug("REDIS_URI: {}", redisUri);
        }
        return redisUri;
    }

}
