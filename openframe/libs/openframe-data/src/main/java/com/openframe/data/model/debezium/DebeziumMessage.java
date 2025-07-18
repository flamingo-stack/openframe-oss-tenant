package com.openframe.data.model.debezium;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;


/**
 * Generic DebeziumMessage for type-safe message handling
 */
@Data
@SuperBuilder
@NoArgsConstructor
public class DebeziumMessage<T> {

    @JsonProperty("payload")
    private Payload<T> payload;

    @Data
    public static class Payload<T> {
        @JsonProperty("before")
        private T before;

        @JsonProperty("after")
        private T after;

        @JsonProperty("source")
        private Source source;

        @JsonProperty("op")
        private String operation;

        @JsonProperty("ts_ms")
        private Long timestamp;

        @Data
        public static class Source {
            @JsonProperty("version")
            private String version;

            @JsonProperty("connector")
            private String connector;

            @JsonProperty("name")
            private String name;

            @JsonProperty("ts_ms")
            private Long timestamp;

            @JsonProperty("snapshot")
            private String snapshot;

            @JsonProperty("db")
            private String database;

            @JsonProperty("sequence")
            private String sequence;
        }
    }
} 