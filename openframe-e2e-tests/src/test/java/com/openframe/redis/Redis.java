package com.openframe.redis;

import redis.clients.jedis.RedisClient;
import redis.clients.jedis.params.ScanParams;
import redis.clients.jedis.resps.ScanResult;

import static com.openframe.config.RedisConfig.getRedisUri;

public class Redis {

    public static String getResetToken(String email) {
        RedisClient redis = RedisClient.create(getRedisUri());
        ScanParams scanParams = new ScanParams().match("pwdreset:*").count(100);
        String cursor = ScanParams.SCAN_POINTER_START;
        String token = null;
        do {
            ScanResult<String> scanResult = redis.scan(cursor, scanParams);
            for (String key : scanResult.getResult()) {
                if (email.equals(redis.get(key))) {
                    token = key.split(":")[1];
                    break;
                }
            }
            if (token != null) break;
            cursor = scanResult.getCursor();
        } while (!cursor.equals(ScanParams.SCAN_POINTER_START));
        redis.close();
        return token;
    }
}
