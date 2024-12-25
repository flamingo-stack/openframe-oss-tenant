package com.openframe.data.repository.mongo;

import java.util.Optional;

import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import com.openframe.core.model.User;

@Repository
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
public interface UserRepository extends MongoRepository<User, String>, BaseUserRepository<Optional<User>, Boolean, String> {
    @Override
    Optional<User> findByEmail(String email);

    @Override
    Optional<User> findByResetToken(String resetToken);

    @Override
    Boolean existsByEmail(String email);
} 