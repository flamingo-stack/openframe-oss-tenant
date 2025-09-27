package com.openframe.management.service;

import com.openframe.management.document.OpenFrameClientConfiguration;
import com.openframe.management.repository.OpenFrameClientConfigurationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class OpenFrameClientConfigurationService {

    private final OpenFrameClientConfigurationRepository repository;

    public Optional<OpenFrameClientConfiguration> findById(String id) {
        return repository.findById(id);
    }

    public OpenFrameClientConfiguration save(OpenFrameClientConfiguration config) {
        return repository.save(config);
    }
}
