// services/openframe-api/src/main/java/com/openframe/api/controller/TestController.java
package com.openframe.api.controller;

import java.util.List;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.openframe.api.model.Event;
import com.openframe.api.service.EventService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/test")
@RequiredArgsConstructor
public class TestController {

    private final EventService eventService;

    @GetMapping("/events")
    public List<Event> getEvents() {
        return eventService.getAllEvents();
    }

    @GetMapping("/events/{id}")
    public Event getEvent(@PathVariable String id) {
        return eventService.getEventById(id);
    }

    @PostMapping("/events")
    public Event createEvent(@RequestBody Event event) {
        return eventService.createEvent(event);
    }

    @PutMapping("/events/{id}")
    public Event updateEvent(@PathVariable String id, @RequestBody Event event) {
        return eventService.updateEvent(id, event);
    }

    @DeleteMapping("/events/{id}")
    public void deleteEvent(@PathVariable String id) {
        eventService.deleteEvent(id);
    }

    @GetMapping("/events/user/{userId}")
    public List<Event> getEventsByUser(@PathVariable String userId) {
        return eventService.getEventsByUserId(userId);
    }

    @GetMapping("/health")
    public String health() {
        return "OK";
    }
}