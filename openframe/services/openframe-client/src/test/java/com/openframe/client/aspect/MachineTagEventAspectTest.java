package com.openframe.client.aspect;

import com.openframe.client.service.MachineTagEventService;
import com.openframe.data.document.device.Machine;
import com.openframe.data.document.device.MachineTag;
import com.openframe.data.document.tool.Tag;
import org.aspectj.lang.ProceedingJoinPoint;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Tests for MachineTagEventAspect to ensure proper interception of repository operations.
 */
@ExtendWith(MockitoExtension.class)
class MachineTagEventAspectTest {

    @Mock
    private MachineTagEventService machineTagEventService;

    @Mock
    private ProceedingJoinPoint proceedingJoinPoint;

    private MachineTagEventAspect machineTagEventAspect;

    @BeforeEach
    void setUp() {
        machineTagEventAspect = new MachineTagEventAspect(machineTagEventService);
    }

    @Test
    void testMachineSaveAspect() {
        // Arrange
        Machine machine = new Machine();
        machine.setId("machine-1");
        machine.setHostname("test-machine");

        // Act - directly call the aspect method
        machineTagEventAspect.afterMachineSave(null, machine, machine);

        // Assert
        verify(machineTagEventService, times(1)).processMachineSave(machine);
    }

    @Test
    void testMachineSaveAllAspect() {
        // Arrange
        Machine machine1 = new Machine();
        machine1.setId("machine-1");
        machine1.setHostname("test-machine-1");

        Machine machine2 = new Machine();
        machine2.setId("machine-2");
        machine2.setHostname("test-machine-2");

        List<Machine> machines = Arrays.asList(machine1, machine2);

        // Act - directly call the aspect method
        machineTagEventAspect.afterMachineSaveAll(null, machines, machines);

        // Assert
        verify(machineTagEventService, times(1)).processMachineSaveAll(machines);
    }

    @Test
    void testMachineTagSaveAspect() {
        // Arrange
        MachineTag machineTag = new MachineTag();
        machineTag.setId("machine-tag-1");
        machineTag.setMachineId("machine-1");
        machineTag.setTagId("tag-1");

        // Act - directly call the aspect method
        machineTagEventAspect.afterMachineTagSave(null, machineTag, machineTag);

        // Assert
        verify(machineTagEventService, times(1)).processMachineTagSave(machineTag);
    }

    @Test
    void testMachineTagSaveAllAspect() {
        // Arrange
        MachineTag machineTag1 = new MachineTag();
        machineTag1.setId("machine-tag-1");
        machineTag1.setMachineId("machine-1");
        machineTag1.setTagId("tag-1");

        MachineTag machineTag2 = new MachineTag();
        machineTag2.setId("machine-tag-2");
        machineTag2.setMachineId("machine-2");
        machineTag2.setTagId("tag-2");

        List<MachineTag> machineTags = Arrays.asList(machineTag1, machineTag2);

        // Act - directly call the aspect method
        machineTagEventAspect.afterMachineTagSaveAll(null, machineTags, machineTags);

        // Assert
        verify(machineTagEventService, times(1)).processMachineTagSaveAll(machineTags);
    }

    @Test
    void testAroundTagSave_ExistingTag() throws Throwable {
        // Arrange
        Tag tag = new Tag();
        tag.setId("tag-1");
        tag.setName("test-tag");
        tag.setColor("#FF0000");

        when(proceedingJoinPoint.proceed()).thenReturn(tag);

        // Act
        Object result = machineTagEventAspect.aroundTagSave(proceedingJoinPoint, tag);

        // Assert
        verify(proceedingJoinPoint, times(1)).proceed();
        verify(machineTagEventService, times(1)).processTagSave(tag);
        assertEquals(tag, result);
    }

    @Test
    void testAroundTagSave_NewTag() throws Throwable {
        // Arrange
        Tag tag = new Tag();
        tag.setName("new-tag");
        tag.setColor("#FF0000");
        // Note: No ID set, so this is a new tag

        when(proceedingJoinPoint.proceed()).thenReturn(tag);

        // Act
        Object result = machineTagEventAspect.aroundTagSave(proceedingJoinPoint, tag);

        // Assert
        verify(proceedingJoinPoint, times(1)).proceed();
        verify(machineTagEventService, never()).processTagSave(any(Tag.class));
        assertEquals(tag, result);
    }

    @Test
    void testAroundTagSaveAll_ExistingTags() throws Throwable {
        // Arrange
        Tag tag1 = new Tag();
        tag1.setId("tag-1");
        tag1.setName("test-tag-1");
        tag1.setColor("#FF0000");

        Tag tag2 = new Tag();
        tag2.setId("tag-2");
        tag2.setName("test-tag-2");
        tag2.setColor("#00FF00");

        List<Tag> tags = Arrays.asList(tag1, tag2);
        List<Tag> results = Arrays.asList(tag1, tag2);

        when(proceedingJoinPoint.proceed()).thenReturn(results);

        // Act
        Object result = machineTagEventAspect.aroundTagSaveAll(proceedingJoinPoint, tags);

        // Assert
        verify(proceedingJoinPoint, times(1)).proceed();
        verify(machineTagEventService, times(1)).processTagSave(tag1);
        verify(machineTagEventService, times(1)).processTagSave(tag2);
        assertEquals(results, result);
    }

    @Test
    void testAroundTagSaveAll_MixedTags() throws Throwable {
        // Arrange
        Tag existingTag = new Tag();
        existingTag.setId("tag-1");
        existingTag.setName("existing-tag");
        existingTag.setColor("#FF0000");

        Tag newTag = new Tag();
        newTag.setName("new-tag");
        newTag.setColor("#00FF00");

        List<Tag> tags = Arrays.asList(existingTag, newTag);
        List<Tag> results = Arrays.asList(existingTag, newTag);

        when(proceedingJoinPoint.proceed()).thenReturn(results);

        // Act
        Object result = machineTagEventAspect.aroundTagSaveAll(proceedingJoinPoint, tags);

        // Assert
        verify(proceedingJoinPoint, times(1)).proceed();
        verify(machineTagEventService, times(1)).processTagSave(existingTag);
        verify(machineTagEventService, never()).processTagSave(newTag);
        assertEquals(results, result);
    }

    @Test
    void testAroundTagSaveAll_NewTagsOnly() throws Throwable {
        // Arrange
        Tag newTag1 = new Tag();
        newTag1.setName("new-tag-1");
        newTag1.setColor("#FF0000");

        Tag newTag2 = new Tag();
        newTag2.setName("new-tag-2");
        newTag2.setColor("#00FF00");

        List<Tag> tags = Arrays.asList(newTag1, newTag2);
        List<Tag> results = Arrays.asList(newTag1, newTag2);

        when(proceedingJoinPoint.proceed()).thenReturn(results);

        // Act
        Object result = machineTagEventAspect.aroundTagSaveAll(proceedingJoinPoint, tags);

        // Assert
        verify(proceedingJoinPoint, times(1)).proceed();
        verify(machineTagEventService, never()).processTagSave(any(Tag.class));
        assertEquals(results, result);
    }

    @Test
    void testErrorHandling_MachineSave() {
        // Arrange
        Machine machine = new Machine();
        machine.setId("machine-1");
        machine.setHostname("test-machine");
        
        doThrow(new RuntimeException("Service error"))
            .when(machineTagEventService).processMachineSave(machine);

        // Act & Assert - should not throw exception
        machineTagEventAspect.afterMachineSave(null, machine, machine);

        // Should still call the service
        verify(machineTagEventService, times(1)).processMachineSave(machine);
    }

    @Test
    void testErrorHandling_MachineTagSave() {
        // Arrange
        MachineTag machineTag = new MachineTag();
        machineTag.setId("machine-tag-1");
        machineTag.setMachineId("machine-1");
        machineTag.setTagId("tag-1");
        
        doThrow(new RuntimeException("Service error"))
            .when(machineTagEventService).processMachineTagSave(machineTag);

        // Act & Assert - should not throw exception
        machineTagEventAspect.afterMachineTagSave(null, machineTag, machineTag);

        // Should still call the service
        verify(machineTagEventService, times(1)).processMachineTagSave(machineTag);
    }

    @Test
    void testErrorHandling_ProceedingJoinPointThrowsException() throws Throwable {
        // Arrange
        Tag tag = new Tag();
        tag.setId("tag-1");
        tag.setName("test-tag");
        tag.setColor("#FF0000");
        
        when(proceedingJoinPoint.proceed()).thenThrow(new RuntimeException("Database error"));

        // Act & Assert - should propagate the exception
        assertThrows(RuntimeException.class, () -> {
            machineTagEventAspect.aroundTagSave(proceedingJoinPoint, tag);
        });

        // Should not call the service because the save operation failed
        verify(machineTagEventService, never()).processTagSave(any(Tag.class));
    }

    @Test
    void testErrorHandling_InvalidCast() {
        // Arrange
        Object invalidObject = "not a machine";

        // Act & Assert - should not throw exception
        machineTagEventAspect.afterMachineSave(null, invalidObject, invalidObject);

        // Should not call the service due to ClassCastException
        verify(machineTagEventService, never()).processMachineSave(any());
    }
} 