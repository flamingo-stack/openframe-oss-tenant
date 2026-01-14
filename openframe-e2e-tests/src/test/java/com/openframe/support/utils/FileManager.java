package com.openframe.support.utils;

import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

public class FileManager {

    private static final ObjectMapper objectMapper = new ObjectMapper();

    public static void save(String fileName, Object entity) {
        try {
            String entityStr = objectMapper.writeValueAsString(entity);
            Files.writeString(Path.of(fileName), entityStr);
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

    public static <T> T read(String fileName, Class<T> cls) {
        try {
            String content = Files.readString(Path.of(fileName));
            return objectMapper.readValue(content, cls);
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }
}
