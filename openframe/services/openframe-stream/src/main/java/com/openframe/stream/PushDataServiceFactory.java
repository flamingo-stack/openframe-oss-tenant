package com.openframe.stream;

import com.openframe.stream.enumeration.DownstreamTool;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
@Slf4j
public class PushDataServiceFactory {

    private final List<PushDataService> pushServices;


    public PushDataServiceFactory(List<PushDataService> pushServices) {
        this.pushServices = pushServices;
    }

    public PushDataService getPushDataService(DownstreamTool downstreamTool) {
        return Optional.ofNullable(downstreamTool).map(toolName -> pushServices.stream()
                .filter(it -> toolName.equals(it.getDownstreamToolName()))
                .findFirst()
                .orElseThrow(() -> throwException(downstreamTool)))
                .orElseThrow(() -> throwException(downstreamTool));
    }

    private IllegalArgumentException throwException(DownstreamTool downstreamTool) {
        log.error("There is no downstream tool named [{}].", downstreamTool);
        return new IllegalArgumentException("There is no downstream tool named [" + downstreamTool + "]");
    }
}
