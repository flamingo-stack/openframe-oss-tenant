package com.openframe.data.repository.mongo;

import com.openframe.core.model.Tag;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TagRepository extends MongoRepository<Tag, String> {
    List<Tag> findByOrganizationId(String organizationId);
    Tag findByNameAndOrganizationId(String name, String organizationId);
    List<Tag> findByNameIn(List<String> names);
}
