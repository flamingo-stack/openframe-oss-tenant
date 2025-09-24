package com.openframe.stream.deserializer;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class JsonNodeToMapConverterTest {

    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
    }

    @Test
    void testSimpleObjectConversion() {
        String json = """
            {
                "id": 123,
                "name": "test",
                "active": true,
                "score": 95.5
            }
            """;

        try {
            JsonNode node = objectMapper.readTree(json);
            Map<String, String> result = new HashMap<>();
            convertJsonNodeToMap(node, "", result);

            assertEquals("123", result.get("id"));
            assertEquals("test", result.get("name"));
            assertEquals("true", result.get("active"));
            assertEquals("95.5", result.get("score"));
            assertEquals(4, result.size());

        } catch (Exception e) {
            fail("Test failed with exception: " + e.getMessage());
        }
    }

    @Test
    void testNestedObjectConversion() {
        String json = """
            {
                "user": {
                    "id": 456,
                    "profile": {
                        "name": "John Doe",
                        "email": "john@example.com"
                    }
                },
                "settings": {
                    "theme": "dark"
                }
            }
            """;

        try {
            JsonNode node = objectMapper.readTree(json);
            Map<String, String> result = new HashMap<>();
            convertJsonNodeToMap(node, "", result);

            assertEquals("456", result.get("user.id"));
            assertEquals("John Doe", result.get("user.profile.name"));
            assertEquals("john@example.com", result.get("user.profile.email"));
            assertEquals("dark", result.get("settings.theme"));
            assertEquals(4, result.size());

        } catch (Exception e) {
            fail("Test failed with exception: " + e.getMessage());
        }
    }

    @Test
    void testArrayConversion() {
        String json = """
            {
                "tags": ["tag1", "tag2", "tag3"],
                "scores": [85, 92, 78],
                "nested": {
                    "items": ["item1", "item2"]
                }
            }
            """;

        try {
            JsonNode node = objectMapper.readTree(json);
            Map<String, String> result = new HashMap<>();
            convertJsonNodeToMap(node, "", result);

            assertEquals("tag1", result.get("tags[0]"));
            assertEquals("tag2", result.get("tags[1]"));
            assertEquals("tag3", result.get("tags[2]"));
            assertEquals("85", result.get("scores[0]"));
            assertEquals("92", result.get("scores[1]"));
            assertEquals("78", result.get("scores[2]"));
            assertEquals("item1", result.get("nested.items[0]"));
            assertEquals("item2", result.get("nested.items[1]"));
            assertEquals(8, result.size());

        } catch (Exception e) {
            fail("Test failed with exception: " + e.getMessage());
        }
    }

    @Test
    void testNullAndEmptyValues() {
        String json = """
            {
                "nullValue": null,
                "emptyString": "",
                "zero": 0,
                "falseValue": false
            }
            """;

        try {
            JsonNode node = objectMapper.readTree(json);
            Map<String, String> result = new HashMap<>();
            convertJsonNodeToMap(node, "", result);

            // null values should not be included
            assertNull(result.get("nullValue"));
            assertEquals("", result.get("emptyString"));
            assertEquals("0", result.get("zero"));
            assertEquals("false", result.get("falseValue"));
            assertEquals(3, result.size()); // null value should not be included

        } catch (Exception e) {
            fail("Test failed with exception: " + e.getMessage());
        }
    }

    @Test
    void testComplexNestedStructure() {
        String json = """
            {
                "_id": {"$oid": "686e70d8a6a36a003412d5e5"},
                "nodeid": "device123",
                "etype": "userlog",
                "action": "login",
                "userid": "user456",
                "msg": "User logged in successfully",
                "timestamp": 1640995200000,
                "details": {
                    "ip": "192.168.1.100",
                    "userAgent": "Mozilla/5.0"
                },
                "tags": ["login", "success"]
            }
            """;

        try {
            JsonNode node = objectMapper.readTree(json);
            Map<String, String> result = new HashMap<>();
            convertJsonNodeToMap(node, "", result);

            assertEquals("686e70d8a6a36a003412d5e5", result.get("_id.$oid"));
            assertEquals("device123", result.get("nodeid"));
            assertEquals("userlog", result.get("etype"));
            assertEquals("login", result.get("action"));
            assertEquals("user456", result.get("userid"));
            assertEquals("User logged in successfully", result.get("msg"));
            assertEquals("1640995200000", result.get("timestamp"));
            assertEquals("192.168.1.100", result.get("details.ip"));
            assertEquals("Mozilla/5.0", result.get("details.userAgent"));
            assertEquals("login", result.get("tags[0]"));
            assertEquals("success", result.get("tags[1]"));
            assertEquals(11, result.size());

        } catch (Exception e) {
            fail("Test failed with exception: " + e.getMessage());
        }
    }

    /**
     * Copy of the conversion method from IntegratedToolEventBrokerDeserializer for testing
     */
    private void convertJsonNodeToMap(JsonNode node, String prefix, Map<String, String> result) {
        if (node.isObject()) {
            var fields = node.fields();
            while (fields.hasNext()) {
                var entry = fields.next();
                String key = prefix.isEmpty() ? entry.getKey() : prefix + "." + entry.getKey();
                convertJsonNodeToMap(entry.getValue(), key, result);
            }
        } else if (node.isArray()) {
            for (int i = 0; i < node.size(); i++) {
                String key = prefix + "[" + i + "]";
                convertJsonNodeToMap(node.get(i), key, result);
            }
        } else {
            // Handle primitive values
            String value;
            if (node.isTextual()) {
                value = node.asText();
            } else if (node.isNumber()) {
                value = node.asText(); // Preserve number format
            } else if (node.isBoolean()) {
                value = String.valueOf(node.asBoolean());
            } else if (node.isNull()) {
                value = null;
            } else {
                value = node.asText();
            }
            
            if (value != null) {
                result.put(prefix, value);
            }
        }
    }
} 