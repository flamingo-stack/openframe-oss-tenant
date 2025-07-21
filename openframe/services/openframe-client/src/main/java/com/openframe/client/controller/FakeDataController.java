package com.openframe.client.controller;

import com.openframe.client.service.FakeDataGenerator;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/fake-data")
@RequiredArgsConstructor
public class FakeDataController {

    private final FakeDataGenerator fakeDataGenerator;

    @PostMapping("/machines")
    public ResponseEntity<String> generateFakeMachines(@RequestParam(defaultValue = "10") int count) {
        String result = fakeDataGenerator.generateFakeMachines(count);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/tags")
    public ResponseEntity<String> generateFakeTags(@RequestParam(defaultValue = "10") int count) {
        String result = fakeDataGenerator.generateFakeTags(count);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/link-machines-tags")
    public ResponseEntity<String> linkMachinesWithTags(@RequestParam(defaultValue = "3") int maxTagsPerMachine) {
        String result = fakeDataGenerator.linkMachinesWithTags(maxTagsPerMachine);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/complete-dataset")
    public ResponseEntity<String> generateCompleteDataset(
            @RequestParam(defaultValue = "10") int machineCount,
            @RequestParam(defaultValue = "20") int tagCount) {
        String result = fakeDataGenerator.generateCompleteDataset(machineCount, tagCount);
        return ResponseEntity.ok(result);
    }
}