package com.openframe.data.repository.mongo;

import com.openframe.core.model.MachineTag;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MachineTagRepository extends MongoRepository<MachineTag, String> {
    List<MachineTag> findByMachineId(String machineId);
    List<MachineTag> findByTagId(String tagId);
    void deleteByMachineId(String machineId);
    void deleteByMachineIdAndTagId(String machineId, String tagId);
}
