// services/openframe-stream/src/main/java/com/openframe/stream/StreamApplication.java
package com.openframe.stream;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.kafka.annotation.EnableKafka;

@SpringBootApplication
@EnableKafka
@ComponentScan(basePackages = {"com.openframe.stream", "com.openframe.data.config", "com.openframe.core.config", "com.openframe.data"})
public class StreamApplication {

    public static void main(String[] args) {
        SpringApplication.run(StreamApplication.class, args);
    }
}
