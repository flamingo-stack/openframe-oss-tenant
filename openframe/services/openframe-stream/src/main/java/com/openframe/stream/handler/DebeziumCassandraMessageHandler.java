package com.openframe.stream.handler;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.cassandra.repository.CassandraRepository;

@Slf4j
public abstract class DebeziumCassandraMessageHandler<T> extends DebeziumMessageHandler<T> {

    private final CassandraRepository repository;

    protected DebeziumCassandraMessageHandler(CassandraRepository repository, ObjectMapper objectMapper) {
        super(objectMapper);
        this.repository = repository;
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
