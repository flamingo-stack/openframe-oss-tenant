package com.openframe.stream.service;

import com.openframe.stream.enumeration.IntegratedTool;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
@Slf4j
public class ITEventTransformationServiceFactory {

    private final List<IntegratedToolEventTransformationService> transformationServices;

    public ITEventTransformationServiceFactory(List<IntegratedToolEventTransformationService> transformationServices) {
        this.transformationServices = transformationServices;
    }

    public IntegratedToolEventTransformationService getTransformationService(IntegratedTool integratedTool) {
        return Optional.ofNullable(integratedTool).map(toolName -> transformationServices.stream()
                        .filter(it -> toolName.equals(it.getIntegratedTool()))
                        .findFirst()
                        .orElseThrow(() -> throwException(integratedTool)))
                .orElseThrow(() -> throwException(integratedTool));
    }

    private IllegalArgumentException throwException(IntegratedTool downstreamTool) {
        log.error("There is no downstream tool named [{}].", downstreamTool);
        return new IllegalArgumentException("There is no downstream tool named [" + downstreamTool + "]");
    }
}
