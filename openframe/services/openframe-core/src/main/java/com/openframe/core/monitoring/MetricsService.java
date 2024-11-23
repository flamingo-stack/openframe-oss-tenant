// services/openframe-core/src/main/java/com/openframe/core/monitoring/MetricsService.java
package com.openframe.core.monitoring;

import org.springframework.stereotype.Service;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor // This will create a constructor with required final fields
public class MetricsService {
    
    private final MeterRegistry meterRegistry;
    
    public void recordEventProcessed(String type) {
        Counter.builder("events.processed")
              .tag("type", type)
              .register(meterRegistry)
              .increment();
    }
    
    public Timer.Sample startTimer() {
        return Timer.start(meterRegistry);
    }
    
    public void stopTimer(Timer.Sample sample, String name, String... tags) {
        sample.stop(Timer.builder(name)
                       .tags(tags)
                       .register(meterRegistry));
    }
}