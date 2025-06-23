package com.openframe.stream.handler;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.openframe.data.model.debezium.DebeziumMessage;
import com.openframe.stream.enumeration.Destination;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.cassandra.repository.CassandraRepository;

@Slf4j
public abstract class DebeziumCassandraMessageHandler<T, U extends DebeziumMessage> extends DebeziumMessageHandler<T, U> {

    private final CassandraRepository repository;

    protected DebeziumCassandraMessageHandler(CassandraRepository repository, ObjectMapper objectMapper, Class<U> clazz) {
        super(objectMapper, clazz);
        this.repository = repository;
    }

    @Override
    public Destination getDestination() {
        return Destination.CASSANDRA;
    }

    protected void handleCreate(T data) {
        repository.save(data);
    }

    protected void handleRead(T message) {
        handleCreate(message);
    }
    protected void handleUpdate(T message) {
        handleCreate(message);
    }
    protected void handleDelete(T data) {
    }
}
