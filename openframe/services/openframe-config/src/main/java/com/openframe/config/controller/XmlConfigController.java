package com.openframe.config.controller;

import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class XmlConfigController {

    @GetMapping(value = "/xml/{filename}.xml", produces = MediaType.APPLICATION_XML_VALUE)
    public ResponseEntity<Resource> getXmlConfig(@PathVariable String filename) {
        Resource resource = new ClassPathResource("config/" + filename + ".xml");
        return ResponseEntity.ok(resource);
    }
}
