package com.openframe.client.aspect;

import com.openframe.client.service.MachineTagEventService;
import com.openframe.core.model.Machine;
import com.openframe.core.model.MachineTag;
import com.openframe.core.model.Tag;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Arrays;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Tests for MachineTagEventAspect to ensure proper interception of repository operations.
 */
@ExtendWith(MockitoExtension.class)
class MachineTagEventAspectTest {

    @Mock
    private MachineTagEventService machineTagEventService;

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
    void testTagSaveAspect_WithOriginalState() {
        // Arrange
        Tag tag = new Tag();
        tag.setId("tag-1");
        tag.setName("test-tag");
        tag.setColor("#FF0000");

        // First capture the original state (simulating beforeTagSave)
        machineTagEventAspect.beforeTagSave(null, tag);

        // Act - call the after save method
        machineTagEventAspect.afterTagSave(null, tag, tag);

        // Assert
        verify(machineTagEventService, times(1)).processTagSave(tag);
    }

    @Test
    void testTagSaveAspect_WithoutOriginalState() {
        // Arrange
        Tag tag = new Tag();
        tag.setId("tag-1");
        tag.setName("test-tag");
        tag.setColor("#FF0000");

        // Act - call the after save method without capturing original state
        machineTagEventAspect.afterTagSave(null, tag, tag);

        // Assert - should not call service because no original state was captured
        verify(machineTagEventService, never()).processTagSave(any(Tag.class));
    }

    @Test
    void testTagSaveAllAspect_WithOriginalStates() {
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

        // First capture the original states (simulating beforeTagSaveAll)
        machineTagEventAspect.beforeTagSaveAll(null, tags);

        // Act - call the after save method
        machineTagEventAspect.afterTagSaveAll(null, tags, tags);

        // Assert
        verify(machineTagEventService, times(1)).processTagSave(tag1);
        verify(machineTagEventService, times(1)).processTagSave(tag2);
    }

    @Test
    void testTagSaveAspect_NewTag() {
        // Arrange
        Tag tag = new Tag();
        tag.setName("new-tag");
        tag.setColor("#FF0000");
        // Note: No ID set, so this is a new tag

        // Act - call the after save method without capturing original state
        machineTagEventAspect.afterTagSave(null, tag, tag);

        // Assert - should not call service because tag has no ID
        verify(machineTagEventService, never()).processTagSave(any(Tag.class));
    }

    @Test
    void testTagSaveAllAspect_MixedTags() {
        // Arrange
        Tag existingTag = new Tag();
        existingTag.setId("tag-1");
        existingTag.setName("existing-tag");
        existingTag.setColor("#FF0000");

        Tag newTag = new Tag();
        newTag.setName("new-tag");
        newTag.setColor("#00FF00");

        List<Tag> tags = Arrays.asList(existingTag, newTag);

        // First capture the original states (only existingTag will be captured)
        machineTagEventAspect.beforeTagSaveAll(null, tags);

        // Act - call the after save method
        machineTagEventAspect.afterTagSaveAll(null, tags, tags);

        // Assert - only existingTag should be processed
        verify(machineTagEventService, times(1)).processTagSave(existingTag);
        verify(machineTagEventService, never()).processTagSave(newTag);
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
    void testErrorHandling_TagSave() {
        // Arrange
        Tag tag = new Tag();
        tag.setId("tag-1");
        tag.setName("test-tag");
        tag.setColor("#FF0000");
        
        // First capture the original state
        machineTagEventAspect.beforeTagSave(null, tag);
        
        doThrow(new RuntimeException("Service error"))
            .when(machineTagEventService).processTagSave(tag);

        // Act & Assert - should not throw exception
        machineTagEventAspect.afterTagSave(null, tag, tag);

        // Should still call the service
        verify(machineTagEventService, times(1)).processTagSave(tag);
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

    @Test
    void testOriginalTagStatesCleanup() {
        // Arrange
        Tag tag = new Tag();
        tag.setId("tag-1");
        tag.setName("test-tag");
        tag.setColor("#FF0000");

        // Capture original state
        machineTagEventAspect.beforeTagSave(null, tag);

        // Act - process the save
        machineTagEventAspect.afterTagSave(null, tag, tag);

        // Act again - should not process because original state was removed
        machineTagEventAspect.afterTagSave(null, tag, tag);

        // Assert - should only be called once
        verify(machineTagEventService, times(1)).processTagSave(tag);
    }
} 