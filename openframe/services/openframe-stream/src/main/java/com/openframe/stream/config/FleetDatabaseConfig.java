package com.openframe.stream.config;

import com.openframe.stream.model.fleet.FleetHost;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.jdbc.DataSourceBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;
import org.springframework.transaction.PlatformTransactionManager;

import javax.sql.DataSource;
import java.util.HashMap;
import java.util.Map;

@Configuration
@EnableJpaRepositories(
    basePackages = "com.openframe.stream.repository.fleet",
    entityManagerFactoryRef = "fleetEntityManagerFactory",
    transactionManagerRef = "fleetTransactionManager"
)
@Slf4j
public class FleetDatabaseConfig {

    @Bean(name = "fleetDataSource")
    @ConfigurationProperties(prefix = "spring.datasource.fleet")
    public DataSource fleetDataSource() {
        log.info("Creating Fleet database DataSource");
        return DataSourceBuilder.create().build();
    }

    @Bean(name = "fleetEntityManagerFactory")
    public LocalContainerEntityManagerFactoryBean fleetEntityManagerFactory(
            @Qualifier("fleetDataSource") DataSource dataSource) {
        
        LocalContainerEntityManagerFactoryBean em = new LocalContainerEntityManagerFactoryBean();
        em.setDataSource(dataSource);
        em.setPackagesToScan(FleetHost.class.getPackage().getName());

        HibernateJpaVendorAdapter vendorAdapter = new HibernateJpaVendorAdapter();
        em.setJpaVendorAdapter(vendorAdapter);

        Map<String, Object> properties = new HashMap<>();
        properties.put("hibernate.hbm2ddl.auto", "validate");
        properties.put("hibernate.dialect", "org.hibernate.dialect.MySQL8Dialect");
        properties.put("hibernate.show_sql", "false");
        properties.put("hibernate.format_sql", "false");
        em.setJpaPropertyMap(properties);

        log.info("Created Fleet EntityManagerFactory");
        return em;
    }

    @Bean(name = "fleetTransactionManager")
    public PlatformTransactionManager fleetTransactionManager(
            @Qualifier("fleetEntityManagerFactory") LocalContainerEntityManagerFactoryBean entityManagerFactory) {
        
        JpaTransactionManager transactionManager = new JpaTransactionManager();
        transactionManager.setEntityManagerFactory(entityManagerFactory.getObject());
        
        log.info("Created Fleet TransactionManager");
        return transactionManager;
    }
} 