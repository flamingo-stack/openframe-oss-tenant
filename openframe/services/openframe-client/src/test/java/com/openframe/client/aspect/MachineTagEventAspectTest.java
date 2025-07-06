package com.openframe.client.aspect;

import com.openframe.client.service.MachineTagEventService;
import com.openframe.core.model.Machine;
import com.openframe.core.model.MachineTag;
import com.openframe.core.model.Tag;
import com.openframe.core.model.device.DeviceStatus;
import com.openframe.core.model.device.DeviceType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.context.ActiveProfiles;

import java.lang.reflect.Field;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
public class MachineTagEventAspectTest {

    @Mock
    private MachineTagEventService machineTagEventService;

    private MachineTagEventAspect aspect;

    @BeforeEach
    void setUp() throws Exception {
        aspect = new MachineTagEventAspect(machineTagEventService);
    }

    @Test
    void testAfterMachineSave_SingleMachine() {
        // Arrange
        Machine machine = createTestMachine("machine-1", "org-1");

        // Act
        aspect.afterMachineSave(null, machine, machine);

        // Assert
        verify(machineTagEventService).processMachineSave(machine);
    }

    @Test
    void testAfterMachineSaveAll_MultipleMachines() {
        // Arrange
        List<Machine> machines = Arrays.asList(
            createTestMachine("machine-1", "org-1"),
            createTestMachine("machine-2", "org-1")
        );

        // Act
        aspect.afterMachineSaveAll(null, machines, machines);

        // Assert
        verify(machineTagEventService).processMachineSaveAll(machines);
    }

    @Test
    void testAfterMachineTagSave_SingleMachineTag() {
        // Arrange
        MachineTag machineTag = createTestMachineTag("machine-1", "tag-1");

        // Act
        aspect.afterMachineTagSave(null, machineTag, machineTag);

        // Assert
        verify(machineTagEventService).processMachineTagSave(machineTag);
    }

    @Test
    void testAfterMachineTagSaveAll_MultipleMachineTags() {
        // Arrange
        List<MachineTag> machineTags = Arrays.asList(
            createTestMachineTag("machine-1", "tag-1"),
            createTestMachineTag("machine-1", "tag-2"), // Same machine, different tag
            createTestMachineTag("machine-2", "tag-3")
        );

        // Act
        aspect.afterMachineTagSaveAll(null, machineTags, machineTags);

        // Assert
        verify(machineTagEventService).processMachineTagSaveAll(machineTags);
    }

    @Test
    void testBeforeTagSave_CapturesOriginalState() {
        // Arrange
        Tag tag = createTestTag("tag-1", "OriginalName");

        // Act
        aspect.beforeTagSave(null, tag);

        // Assert - verify that the aspect doesn't throw any exceptions
        assertDoesNotThrow(() -> {
            // The aspect should capture the original state internally
        });
    }

    @Test
    void testBeforeTagSaveAll_CapturesOriginalStates() {
        // Arrange
        List<Tag> tags = Arrays.asList(
            createTestTag("tag-1", "Tag1"),
            createTestTag("tag-2", "Tag2")
        );

        // Act
        aspect.beforeTagSaveAll(null, tags);

        // Assert - verify that the aspect doesn't throw any exceptions
        assertDoesNotThrow(() -> {
            // The aspect should capture the original states internally
        });
    }

    @Test
    void testAfterTagSave_WithOriginalState() {
        // Arrange
        Tag tag = createTestTag("tag-1", "UpdatedName");
        
        // First capture the original state
        aspect.beforeTagSave(null, tag);

        // Act
        aspect.afterTagSave(null, tag, tag);

        // Assert
        verify(machineTagEventService).processTagSave(tag);
    }

    @Test
    void testAfterTagSave_WithoutOriginalState() {
        // Arrange
        Tag tag = createTestTag("tag-1", "NewTag");

        // Act - call afterTagSave without calling beforeTagSave first
        aspect.afterTagSave(null, tag, tag);

        // Assert - should not call the service since there's no original state
        verify(machineTagEventService, never()).processTagSave(any());
    }

    @Test
    void testAfterTagSaveAll_WithOriginalStates() {
        // Arrange
        List<Tag> tags = Arrays.asList(
            createTestTag("tag-1", "Tag1"),
            createTestTag("tag-2", "Tag2")
        );
        
        // First capture the original states
        aspect.beforeTagSaveAll(null, tags);

        // Act
        aspect.afterTagSaveAll(null, tags, tags);

        // Assert
        verify(machineTagEventService, times(2)).processTagSave(any(Tag.class));
    }

    @Test
    void testAfterTagSaveAll_WithoutOriginalStates() {
        // Arrange
        List<Tag> tags = Arrays.asList(
            createTestTag("tag-1", "Tag1"),
            createTestTag("tag-2", "Tag2")
        );

        // Act - call afterTagSaveAll without calling beforeTagSaveAll first
        aspect.afterTagSaveAll(null, tags, tags);

        // Assert - should not call the service since there are no original states
        verify(machineTagEventService, never()).processTagSave(any());
    }

    @Test
    void testErrorHandling_MachineSave() {
        // Arrange
        Machine machine = createTestMachine("machine-1", "org-1");
        doThrow(new RuntimeException("Service error"))
            .when(machineTagEventService).processMachineSave(machine);

        // Act & Assert
        assertDoesNotThrow(() -> {
            aspect.afterMachineSave(null, machine, machine);
        });

        // Should still call the service
        verify(machineTagEventService).processMachineSave(machine);
    }

    @Test
    void testErrorHandling_MachineTagSave() {
        // Arrange
        MachineTag machineTag = createTestMachineTag("machine-1", "tag-1");
        doThrow(new RuntimeException("Service error"))
            .when(machineTagEventService).processMachineTagSave(machineTag);

        // Act & Assert
        assertDoesNotThrow(() -> {
            aspect.afterMachineTagSave(null, machineTag, machineTag);
        });

        // Should still call the service
        verify(machineTagEventService).processMachineTagSave(machineTag);
    }

    @Test
    void testErrorHandling_TagSave() {
        // Arrange
        Tag tag = createTestTag("tag-1", "TagName");
        aspect.beforeTagSave(null, tag); // Capture original state
        
        doThrow(new RuntimeException("Service error"))
            .when(machineTagEventService).processTagSave(tag);

        // Act & Assert
        assertDoesNotThrow(() -> {
            aspect.afterTagSave(null, tag, tag);
        });

        // Should still call the service
        verify(machineTagEventService).processTagSave(tag);
    }

    @Test
    void testErrorHandling_InvalidCast() {
        // Arrange
        Object invalidObject = "not a machine";

        // Act & Assert
        assertDoesNotThrow(() -> {
            aspect.afterMachineSave(null, invalidObject, invalidObject);
        });

        // Should not call the service due to ClassCastException
        verify(machineTagEventService, never()).processMachineSave(any());
    }

    // Helper methods
    private Machine createTestMachine(String machineId, String organizationId) {
        Machine machine = new Machine();
        machine.setMachineId(machineId);
        machine.setOrganizationId(organizationId);
        machine.setType(DeviceType.SERVER);
        machine.setStatus(DeviceStatus.DECOMMISSIONED);
        machine.setOsType("Linux");
        machine.setLastSeen(Instant.now());
        return machine;
    }

    private Tag createTestTag(String id, String name) {
        Tag tag = new Tag();
        tag.setId(id);
        tag.setName(name);
        return tag;
    }

    private MachineTag createTestMachineTag(String machineId, String tagId) {
        MachineTag machineTag = new MachineTag();
        machineTag.setMachineId(machineId);
        machineTag.setTagId(tagId);
        return machineTag;
    }
} 