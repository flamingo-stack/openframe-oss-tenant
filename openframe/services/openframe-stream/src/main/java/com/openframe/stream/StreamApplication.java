// services/openframe-stream/src/main/java/com/openframe/stream/StreamApplication.java
package com.openframe.stream;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication
@EntityScan(basePackages = {
    "com.openframe.stream.repository.fleet",
    "com.openframe.data.model.fleet"
})
@EnableJpaRepositories(basePackages = {
    "com.openframe.stream.repository.fleet",
    "com.openframe.data.repository.fleet"
})
public class StreamApplication {

    public static void main(String[] args) {
        SpringApplication.run(StreamApplication.class, args);
    }
}
