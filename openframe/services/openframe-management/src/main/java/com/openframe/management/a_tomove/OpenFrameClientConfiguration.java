package com.openframe.management.a_tomove;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * Minimal client configuration containing only default Mongo document id and version.
 */
@Document(collection = "openframe_client_configuration")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OpenFrameClientConfiguration {
    @Id
    private String id;
    private String version;
}
