package com.openframe.api.config;

import com.openframe.api.dto.SSOProviderInfo;
import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Data
@Configuration
@ConfigurationProperties(prefix = "sso")
public class SSOProperties {
    private List<SSOProviderInfo> providers;
}


