package com.openframe.api.repository;

import org.springframework.data.mongodb.repository.MongoRepository;

import com.openframe.core.model.User;

public interface UserRepository extends MongoRepository<User, String> {
    User findByEmail(String email);
} 