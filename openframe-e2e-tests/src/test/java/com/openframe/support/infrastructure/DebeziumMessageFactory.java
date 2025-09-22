package com.openframe.support.infrastructure;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.extern.slf4j.Slf4j;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Slf4j
public class DebeziumMessageFactory {
    
    private static final ObjectMapper mapper = new ObjectMapper();
    
    public static String createMeshCentralEvent(String machineId, String eventType, String testRunId) {
        try {
            ObjectNode envelope = mapper.createObjectNode();
            
            ObjectNode payload = mapper.createObjectNode();
            payload.putNull("before");
            Map<String, Object> mongoDoc = new HashMap<>();
            mongoDoc.put("_id", Map.of("$oid", UUID.randomUUID().toString().replace("-", "").substring(0, 24)));
            mongoDoc.put("nodeid", machineId);
            mongoDoc.put("etype", "node");
            mongoDoc.put("action", eventType);
            mongoDoc.put("msg", String.format("Test MeshCentral event for %s [%s]", eventType, testRunId));
            mongoDoc.put("time", Instant.now().toString());
            mongoDoc.put("userid", "test-user-" + testRunId);
            mongoDoc.put("domain", testRunId);
            
            String afterJson = mapper.writeValueAsString(mongoDoc);
            payload.put("after", afterJson);
            
            ObjectNode source = mapper.createObjectNode();
            source.put("version", "1.9.7.Final");
            source.put("connector", "mongodb");
            source.put("name", "meshcentral");
            source.put("ts_ms", System.currentTimeMillis());
            source.put("snapshot", "false");
            source.put("db", "meshcentral");
            source.put("sequence", mapper.writeValueAsString(Map.of()));
            source.put("rs", "rs0");
            source.put("collection", "events");
            source.put("ord", 1);
            
            payload.set("source", source);
            
            payload.put("op", "c");
            payload.put("ts_ms", System.currentTimeMillis());
            payload.putNull("transaction");
            
            envelope.set("payload", payload);
            envelope.putNull("schema");
            return mapper.writeValueAsString(envelope);
            
        } catch (Exception e) {
            log.error("Failed to create MeshCentral message: {}", e.getMessage());
            throw new RuntimeException("Failed to create test message", e);
        }
    }
    
    public static String createTacticalRmmEvent(String agentId, String scriptName, String testRunId) {
        try {
            ObjectNode envelope = mapper.createObjectNode();
            ObjectNode payload = mapper.createObjectNode();
            
            ObjectNode after = mapper.createObjectNode();
            after.put("id", Math.abs(UUID.randomUUID().hashCode()));
            after.put("agentid", agentId);
            after.put("object_type", "agent");
            after.put("action", "script_run");
            after.put("message", String.format("Script '%s' executed [%s]", scriptName, testRunId));
            after.put("entry_time", Instant.now().toString());
            after.put("script_name", scriptName);
            after.put("test_run", testRunId);
            
            payload.putNull("before");
            payload.set("after", after);
            
            ObjectNode source = mapper.createObjectNode();
            source.put("version", "1.9.7.Final");
            source.put("connector", "postgresql");
            source.put("name", "tactical-rmm");
            source.put("ts_ms", System.currentTimeMillis());
            source.put("snapshot", "false");
            source.put("db", "tactical_rmm");
            source.put("sequence", mapper.writeValueAsString(new String[]{"[\"1234567890\",\"1234567890\"]"}));
            source.put("schema", "public");
            source.put("table", "events");
            source.put("txId", 12345);
            source.put("lsn", 1234567890);
            source.putNull("xmin");
            
            payload.set("source", source);
            payload.put("op", "c");
            payload.put("ts_ms", System.currentTimeMillis());
            payload.putNull("transaction");
            
            envelope.set("payload", payload);
            envelope.putNull("schema");
            
            return mapper.writeValueAsString(envelope);
            
        } catch (Exception e) {
            log.error("Failed to create Tactical RMM message: {}", e.getMessage());
            throw new RuntimeException("Failed to create test message", e);
        }
    }
    
    public static String createFleetMdmEvent(String hostId, String activityType, String testRunId) {
        try {
            ObjectNode envelope = mapper.createObjectNode();
            ObjectNode payload = mapper.createObjectNode();
            
            ObjectNode after = mapper.createObjectNode();
            after.put("id", Math.abs(UUID.randomUUID().hashCode()));
            after.put("agentId", hostId);
            after.put("activity_type", activityType);
            after.put("details", mapper.writeValueAsString(Map.of(
                "activity", activityType,
                "hostId", hostId,
                "platform", "darwin",
                "testRun", testRunId
            )));
            after.put("created_at", Instant.now().toString());
            
            payload.putNull("before");
            payload.set("after", after);
            
            ObjectNode source = mapper.createObjectNode();
            source.put("version", "1.9.7.Final");
            source.put("connector", "mysql");
            source.put("name", "fleet");
            source.put("ts_ms", System.currentTimeMillis());
            source.put("snapshot", "false");
            source.put("db", "fleet");
            source.putNull("sequence");
            source.put("table", "activities");
            source.put("server_id", 1);
            source.putNull("gtid");
            source.put("file", "binlog.000003");
            source.put("pos", 12345);
            source.put("row", 0);
            source.putNull("thread");
            source.putNull("query");
            
            payload.set("source", source);
            payload.put("op", "c");
            payload.put("ts_ms", System.currentTimeMillis());
            payload.putNull("transaction");
            
            envelope.set("payload", payload);
            envelope.putNull("schema");
            
            return mapper.writeValueAsString(envelope);
            
        } catch (Exception e) {
            log.error("Failed to create Fleet MDM message: {}", e.getMessage());
            throw new RuntimeException("Failed to create test message", e);
        }
    }

}