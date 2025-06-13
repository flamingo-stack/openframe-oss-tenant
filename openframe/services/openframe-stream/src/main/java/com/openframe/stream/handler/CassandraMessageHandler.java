package com.openframe.stream.handler;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.cassandra.repository.CassandraRepository;

import java.util.Map;

@Slf4j
public abstract class CassandraMessageHandler<T> extends GenericMessageHandler<T> {

    private final CassandraRepository repository;

    protected CassandraMessageHandler(CassandraRepository repository, ObjectMapper objectMapper) {
        super(objectMapper);
        this.repository = repository;
    }

    protected abstract T transform(JsonNode message);

    protected void pushData(T data) {
        repository.save(data);
    }
}
