package com.openframe.gateway;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.gateway.route.RouteLocator;
import org.springframework.cloud.gateway.route.builder.RouteLocatorBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.web.server.ServerWebExchange;

import com.openframe.data.model.IntegratedTool;
import com.openframe.data.repository.mongo.IntegratedToolRepository;

import lombok.RequiredArgsConstructor;
import reactor.core.publisher.Mono;

@SpringBootApplication
@ComponentScan(basePackages = {"com.openframe.gateway", "com.openframe.core", "com.openframe.data",  "com.openframe.security"})
@RequiredArgsConstructor
public class GatewayApplication {

    private final IntegratedToolRepository toolRepository;

    public static void main(String[] args) {
        SpringApplication.run(GatewayApplication.class, args);
    }

    @Bean
    public RouteLocator customRouteLocator(RouteLocatorBuilder builder) {
        var routes = builder.routes();

        // Add routes for each enabled integrated tool
        toolRepository.findByEnabledTrue().ifPresent(tools
                -> tools.forEach(tool -> {
                    routes.route(tool.getId(), r -> r
                            .path("/integrations/" + tool.getType() + "/**")
                            .filters(f -> f
                            .rewritePath("/integrations/" + tool.getType() + "/(?<segment>.*)", "/${segment}")
                            .addRequestHeader("Authorization", "Bearer " + tool.getCredentials().getToken())
                            .modifyRequestBody(String.class, String.class,
                                    (exchange, body) -> addCustomHeaders(exchange, body, tool)))
                            .uri(tool.getUrl()));
                })
        );

        return routes.build();
    }

    private Mono<String> addCustomHeaders(ServerWebExchange exchange, String body, IntegratedTool tool) {
        if (tool.getCredentials() != null) {
            exchange.getRequest().mutate()
                    .header("Authorization", "Bearer " + tool.getCredentials().getToken());
        }
        return Mono.just(body);
    }
}
