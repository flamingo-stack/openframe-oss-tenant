package com.openframe.data.repository.mongo;

import org.springframework.data.mongodb.repository.MongoRepository;

import com.openframe.core.model.Event;

public interface EventRepository extends MongoRepository<Event, String>, CustomEventRepository {
}
