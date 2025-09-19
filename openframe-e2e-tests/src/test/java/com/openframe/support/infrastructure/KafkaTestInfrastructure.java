package com.openframe.support.infrastructure;

import java.time.Duration;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Properties;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.clients.consumer.KafkaConsumer;
import org.apache.kafka.clients.producer.KafkaProducer;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.apache.kafka.common.serialization.StringSerializer;

import lombok.extern.slf4j.Slf4j;

/**
 * Kafka Test Infrastructure for True E2E Pipeline Testingx
 * This infrastructure connects to the real Kafka cluster in K8s
 * and allows tests to produce and consume messages to verify
 * the complete pipeline flow.
 */
@Slf4j
public class KafkaTestInfrastructure implements AutoCloseable {

    private static final String KAFKA_BOOTSTRAP_SERVERS = 
        System.getProperty("kafka.bootstrap.servers", "kafka.datasources.svc.cluster.local:9092");

    public static final String TOPIC_MESHCENTRAL_EVENTS = "meshcentral.mongodb.events";
    public static final String TOPIC_TACTICAL_RMM_EVENTS = "tactical-rmm.postgres.events";
    public static final String TOPIC_FLEET_MDM_EVENTS = "fleet.mysql.events";
    public static final String TOPIC_PINOT_EVENTS = "integrated-tool.events.pinot";
    public static final String TOPIC_DEVICES = "devices-topic";
    
    private final KafkaProducer<String, String> producer;
    private final Map<String, KafkaConsumer<String, String>> consumers;
    private final Map<String, List<ConsumerRecord<String, String>>> consumedMessages;
    private final Map<String, AtomicBoolean> consumerRunning;
    private final String testRunId;
    
    public KafkaTestInfrastructure(String testRunId) {
        this.testRunId = testRunId;
        this.producer = createProducer();
        this.consumers = new ConcurrentHashMap<>();
        this.consumedMessages = new ConcurrentHashMap<>();
        this.consumerRunning = new ConcurrentHashMap<>();
        
        log.info("[{}] Kafka test infrastructure initialized with bootstrap servers: {}", 
            testRunId, KAFKA_BOOTSTRAP_SERVERS);
    }
    
    /**
     * Create Kafka producer with proper configuration
     */
    private KafkaProducer<String, String> createProducer() {
        Properties props = new Properties();
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, KAFKA_BOOTSTRAP_SERVERS);
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
        props.put(ProducerConfig.CLIENT_ID_CONFIG, "e2e-test-producer-" + testRunId);
        props.put(ProducerConfig.ACKS_CONFIG, "all");
        props.put(ProducerConfig.RETRIES_CONFIG, 3);
        props.put(ProducerConfig.MAX_IN_FLIGHT_REQUESTS_PER_CONNECTION, 1);
        
        return new KafkaProducer<>(props);
    }
    
    /**
     * Create Kafka consumer for a specific topic
     */
    private KafkaConsumer<String, String> createConsumer(String topic, String groupId) {
        Properties props = new Properties();
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, KAFKA_BOOTSTRAP_SERVERS);
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());
        props.put(ConsumerConfig.GROUP_ID_CONFIG, groupId);
        props.put(ConsumerConfig.CLIENT_ID_CONFIG, "e2e-test-consumer-" + testRunId);
        props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");
        props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, false);
        props.put(ConsumerConfig.MAX_POLL_RECORDS_CONFIG, 100);
        
        KafkaConsumer<String, String> consumer = new KafkaConsumer<>(props);
        consumer.subscribe(Collections.singletonList(topic));
        return consumer;
    }
    
    /**
     * Publish message to Kafka topic
     * @return CompletableFuture with send result
     */
    public CompletableFuture<Boolean> publishMessage(String topic, String key, String message) {
        CompletableFuture<Boolean> future = new CompletableFuture<>();
        
        try {
            ProducerRecord<String, String> record = new ProducerRecord<>(topic, key, message);
            
            if (topic.equals(TOPIC_MESHCENTRAL_EVENTS)) {
                record.headers().add("message-type", "MESHCENTRAL_EVENT".getBytes());
            } else if (topic.equals(TOPIC_TACTICAL_RMM_EVENTS)) {
                record.headers().add("message-type", "TACTICAL_RMM_EVENT".getBytes());
            } else if (topic.equals(TOPIC_FLEET_MDM_EVENTS)) {
                record.headers().add("message-type", "FLEET_MDM_EVENT".getBytes());
            }
            
            producer.send(record, (metadata, exception) -> {
                if (exception != null) {
                    log.error("[{}] Failed to send message to topic {}: {}", 
                        testRunId, topic, exception.getMessage());
                    future.complete(false);
                } else {
                    log.info("[{}] Message sent to topic {} partition {} offset {} with headers", 
                        testRunId, metadata.topic(), metadata.partition(), metadata.offset());
                    future.complete(true);
                }
            });
            
        } catch (Exception e) {
            log.error("[{}] Error publishing message: {}", testRunId, e.getMessage());
            future.complete(false);
        }
        
        return future;
    }
    
    /**
     * Start consuming from a topic
     * Runs in background thread and collects messages
     */
    public void startConsuming(String topic) {
        String groupId = "e2e-test-" + testRunId + "-" + UUID.randomUUID().toString();
        KafkaConsumer<String, String> consumer = createConsumer(topic, groupId);
        AtomicBoolean running = new AtomicBoolean(true);
        
        consumers.put(topic, consumer);
        consumedMessages.put(topic, Collections.synchronizedList(new ArrayList<>()));
        consumerRunning.put(topic, running);
        
        Thread consumerThread = new Thread(() -> {
            log.info("[{}] Started consuming from topic: {}", testRunId, topic);
            
            while (running.get()) {
                try {
                    var records = consumer.poll(Duration.ofMillis(100));
                    for (var record : records) {
                        log.debug("[{}] Consumed message from {}: key={}, value={}", 
                            testRunId, topic, record.key(), record.value());
                        consumedMessages.get(topic).add(record);
                    }
                    
                    if (!records.isEmpty()) {
                        consumer.commitSync();
                    }
                } catch (Exception e) {
                    if (running.get()) {
                        log.error("[{}] Error consuming from topic {}: {}", 
                            testRunId, topic, e.getMessage());
                    }
                    break;
                }
            }
            
            log.info("[{}] Stopped consuming from topic: {}", testRunId, topic);
        });
        
        consumerThread.setDaemon(true);
        consumerThread.setName("Kafka-Consumer-" + topic);
        consumerThread.start();
    }
    
    /**
     * Wait for a specific message to appear in consumed messages
     * @param topic The topic to check
     * @param predicate Function to identify the expected message
     * @param timeout Maximum time to wait
     * @return The matching message or null if timeout
     */
    public ConsumerRecord<String, String> waitForMessage(
            String topic, 
            java.util.function.Predicate<ConsumerRecord<String, String>> predicate,
            Duration timeout) {
        
        long endTime = System.currentTimeMillis() + timeout.toMillis();
        
        while (System.currentTimeMillis() < endTime) {
            List<ConsumerRecord<String, String>> messages = consumedMessages.get(topic);
            if (messages != null) {
                for (ConsumerRecord<String, String> record : messages) {
                    if (predicate.test(record)) {
                        log.info("[{}] Found expected message in topic {}", testRunId, topic);
                        return record;
                    }
                }
            }
            
            try {
                Thread.sleep(500);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            }
        }
        
        log.warn("[{}] Timeout waiting for message in topic {}", testRunId, topic);
        return null;
    }
    
    /**
     * Get all consumed messages for a topic
     */
    public List<ConsumerRecord<String, String>> getConsumedMessages(String topic) {
        return new ArrayList<>(consumedMessages.getOrDefault(topic, Collections.emptyList()));
    }
    
    /**
     * Stop consuming from a topic
     */
    public void stopConsuming(String topic) {
        AtomicBoolean running = consumerRunning.remove(topic);
        if (running != null) {
            running.set(false);
        }
        
        KafkaConsumer<String, String> consumer = consumers.remove(topic);
        if (consumer != null) {
            try {
                consumer.wakeup();
                TimeUnit.SECONDS.sleep(1);
                consumer.close();
            } catch (Exception e) {
                log.error("[{}] Error closing consumer for topic {}: {}", 
                    testRunId, topic, e.getMessage());
            }
        }
    }
    
    @Override
    public void close() {
        new ArrayList<>(consumers.keySet()).forEach(this::stopConsuming);
        if (producer != null) {
            producer.close();
        }
    }
}