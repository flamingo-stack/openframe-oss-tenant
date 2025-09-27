package com.openframe.management.a_tomove;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface OpenFrameClientConfigurationRepository extends MongoRepository<OpenFrameClientConfiguration, String> {
}
