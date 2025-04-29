package com.openframe.core.model;

import java.time.Instant;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import lombok.Data;

@Data
@Document(collection = "machine_tags")
@CompoundIndexes({
        @CompoundIndex(name = "machine_tag_idx", def = "{'machineId': 1, 'tagId': 1}", unique = true)
})
public class MachineTag {
    @Id
    private String id;

    private String machineId;
    private String tagId;

    private Instant taggedAt;
    private String taggedBy;
}