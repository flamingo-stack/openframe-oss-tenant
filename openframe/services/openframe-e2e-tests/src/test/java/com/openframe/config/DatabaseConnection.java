package com.openframe.config;

import lombok.extern.slf4j.Slf4j;

import java.sql.*;

@Slf4j
public class DatabaseConnection {

    private static String DB_URL;
    private static String DB_USERNAME;
    private static String DB_PASSWORD;

    private static Connection getConnection() throws SQLException {
        return DriverManager.getConnection(DB_URL, DB_USERNAME, DB_PASSWORD);
    }

    public static void executeQuery(String sql) {
        try (Connection connection = getConnection();
             Statement statement = connection.createStatement()) {
            
            log.info("Executing SQL: {}", sql);
            statement.execute(sql);
            log.info("SQL executed successfully");
            
        } catch (SQLException e) {
            log.error("Failed to execute SQL: {}", sql, e);
            throw new RuntimeException("Database operation failed", e);
        }
    }

    private static ResultSet executeQueryWithResult(String sql) throws SQLException {
        Connection connection = getConnection();
        Statement statement = connection.createStatement();
        return statement.executeQuery(sql);
    }
} 