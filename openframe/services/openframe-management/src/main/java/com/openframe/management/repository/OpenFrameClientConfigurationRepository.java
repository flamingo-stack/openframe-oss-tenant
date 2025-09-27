package com.openframe.management.repository;

import com.openframe.management.document.OpenFrameClientConfiguration;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface OpenFrameClientConfigurationRepository extends MongoRepository<OpenFrameClientConfiguration, String> {
}
