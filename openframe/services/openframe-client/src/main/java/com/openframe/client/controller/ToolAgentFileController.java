package com.openframe.client.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.io.InputStream;

@RestController
@RequestMapping("/tool-agent/{toolId}")
public class ToolAgentFileController {

    // TODO: remove after github artifact is implemented
    //  Currently we return hardcoded content for testing purposes only
    @GetMapping
    public byte[] getToolAgentFile(@PathVariable String toolId) {
        try (InputStream stream = ToolAgentFileController.class.getResourceAsStream("/tool_agent_binary")) {
            if (stream == null) {
                throw new RuntimeException("No content");
            }
            return stream.readAllBytes();
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

}
