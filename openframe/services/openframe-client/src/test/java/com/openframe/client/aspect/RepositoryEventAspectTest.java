package com.openframe.client.aspect;

import com.openframe.client.dto.MachinePinotMessage;
import com.openframe.core.model.Machine;
import com.openframe.core.model.MachineTag;
import com.openframe.core.model.Tag;
import com.openframe.core.model.device.DeviceStatus;
import com.openframe.core.model.device.DeviceType;
import com.openframe.data.repository.kafka.GenericKafkaProducer;
import com.openframe.data.repository.mongo.MachineRepository;
import com.openframe.data.repository.mongo.MachineTagRepository;
import com.openframe.data.repository.mongo.TagRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.context.ActiveProfiles;

import java.lang.reflect.Field;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
public class RepositoryEventAspectTest {

    @Mock
    private MachineRepository machineRepository;

    @Mock
    private MachineTagRepository machineTagRepository;

    @Mock
    private TagRepository tagRepository;

    @Mock
    private GenericKafkaProducer kafkaProducer;

    @Captor
    private ArgumentCaptor<MachinePinotMessage> messageCaptor;

    @Captor
    private ArgumentCaptor<String> topicCaptor;

    @Captor
    private ArgumentCaptor<String> keyCaptor;

    private RepositoryEventAspect aspect;

    @BeforeEach
    void setUp() throws Exception {
        aspect = new RepositoryEventAspect(
            machineRepository,
            machineTagRepository,
            tagRepository,
            kafkaProducer
        );
        
        // Set the topic name using reflection since @Value doesn't work in unit tests
        Field topicField = RepositoryEventAspect.class.getDeclaredField("machineEventsTopic");
        topicField.setAccessible(true);
        topicField.set(aspect, "pinot-events");
    }

    @Test
    void testAfterMachineSave_SingleMachine() {
        // Arrange
        Machine machine = createTestMachine("machine-1", "org-1");
        List<Tag> tags = Arrays.asList(
            createTestTag("tag-1", "Production"),
            createTestTag("tag-2", "Database")
        );

        when(machineTagRepository.findByMachineId("machine-1"))
            .thenReturn(Arrays.asList(
                createTestMachineTag("machine-1", "tag-1"),
                createTestMachineTag("machine-1", "tag-2")
            ));
        when(tagRepository.findAllById(Arrays.asList("tag-1", "tag-2")))
            .thenReturn(tags);

        // Act
        aspect.afterMachineSave(null, machine, machine);

        // Assert
        verify(kafkaProducer).sendMessage(
            eq("pinot-events"),
            eq("machine-1"),
            messageCaptor.capture()
        );

        MachinePinotMessage capturedMessage = messageCaptor.getValue();
        assertEquals("machine-1", capturedMessage.getMachineId());
        assertEquals("org-1", capturedMessage.getOrganizationId());
        assertEquals("SERVER", capturedMessage.getDeviceType());
        assertEquals("DECOMMISSIONED", capturedMessage.getStatus());
        assertEquals("Linux", capturedMessage.getOsType());
        assertEquals(2, capturedMessage.getTags().size());
        assertTrue(capturedMessage.getTags().contains("Production"));
        assertTrue(capturedMessage.getTags().contains("Database"));
    }

    @Test
    void testAfterMachineSaveAll_MultipleMachines() {
        // Arrange
        List<Machine> machines = Arrays.asList(
            createTestMachine("machine-1", "org-1"),
            createTestMachine("machine-2", "org-1")
        );

        when(machineTagRepository.findByMachineId("machine-1"))
            .thenReturn(List.of(createTestMachineTag("machine-1", "tag-1")));
        when(machineTagRepository.findByMachineId("machine-2"))
            .thenReturn(List.of(createTestMachineTag("machine-2", "tag-2")));
        when(tagRepository.findAllById(List.of("tag-1")))
            .thenReturn(List.of(createTestTag("tag-1", "Production")));
        when(tagRepository.findAllById(List.of("tag-2")))
            .thenReturn(List.of(createTestTag("tag-2", "Development")));

        // Act
        aspect.afterMachineSaveAll(null, machines, machines);

        // Assert
        verify(kafkaProducer, times(2)).sendMessage(
            eq("pinot-events"),
            anyString(),
            any(MachinePinotMessage.class)
        );
    }

    @Test
    void testAfterMachineTagSave_SingleMachineTag() {
        // Arrange
        MachineTag machineTag = createTestMachineTag("machine-1", "tag-1");
        Machine machine = createTestMachine("machine-1", "org-1");
        List<Tag> tags = List.of(createTestTag("tag-1", "Production"));

        when(machineRepository.findByMachineId("machine-1"))
            .thenReturn(Optional.of(machine));
        when(machineTagRepository.findByMachineId("machine-1"))
            .thenReturn(List.of(machineTag));
        when(tagRepository.findAllById(List.of("tag-1")))
            .thenReturn(tags);

        // Act
        aspect.afterMachineTagSave(null, machineTag, machineTag);

        // Assert
        verify(kafkaProducer).sendMessage(
            eq("pinot-events"),
            eq("machine-1"),
            messageCaptor.capture()
        );

        MachinePinotMessage capturedMessage = messageCaptor.getValue();
        assertEquals("machine-1", capturedMessage.getMachineId());
        assertEquals(1, capturedMessage.getTags().size());
        assertTrue(capturedMessage.getTags().contains("Production"));
    }

    @Test
    void testAfterMachineTagSaveAll_MultipleMachineTags() {
        // Arrange
        List<MachineTag> machineTags = Arrays.asList(
            createTestMachineTag("machine-1", "tag-1"),
            createTestMachineTag("machine-1", "tag-2"), // Same machine, different tag
            createTestMachineTag("machine-2", "tag-3")
        );

        Machine machine1 = createTestMachine("machine-1", "org-1");
        Machine machine2 = createTestMachine("machine-2", "org-1");

        when(machineRepository.findByMachineId("machine-1"))
            .thenReturn(Optional.of(machine1));
        when(machineRepository.findByMachineId("machine-2"))
            .thenReturn(Optional.of(machine2));
        when(machineTagRepository.findByMachineId("machine-1"))
            .thenReturn(Arrays.asList(
                createTestMachineTag("machine-1", "tag-1"),
                createTestMachineTag("machine-1", "tag-2")
            ));
        when(machineTagRepository.findByMachineId("machine-2"))
            .thenReturn(List.of(createTestMachineTag("machine-2", "tag-3")));
        when(tagRepository.findAllById(Arrays.asList("tag-1", "tag-2")))
            .thenReturn(Arrays.asList(
                createTestTag("tag-1", "Production"),
                createTestTag("tag-2", "Database")
            ));
        when(tagRepository.findAllById(List.of("tag-3")))
            .thenReturn(List.of(createTestTag("tag-3", "Development")));

        // Act
        aspect.afterMachineTagSaveAll(null, machineTags, machineTags);

        // Assert
        // Should only send 2 messages (one per unique machine)
        verify(kafkaProducer, times(2)).sendMessage(
            eq("pinot-events"),
            anyString(),
            any(MachinePinotMessage.class)
        );
    }

    @Test
    void testBeforeTagSave_CapturesOriginalState() {
        // Arrange
        Tag tag = createTestTag("tag-1", "NewName");

        // Act
        aspect.beforeTagSave(null, tag);

        // Assert
        // The aspect should capture the original state
        // We can't directly verify the internal state, but we can verify no exceptions
        assertDoesNotThrow(() -> aspect.beforeTagSave(null, tag));
    }

    @Test
    void testBeforeTagSaveAll_CapturesOriginalStates() {
        // Arrange
        List<Tag> tags = Arrays.asList(
            createTestTag("tag-1", "Production"),
            createTestTag("tag-2", "Development")
        );

        // Act
        aspect.beforeTagSaveAll(null, tags);

        // Assert
        // Should not throw exception
        assertDoesNotThrow(() -> aspect.beforeTagSaveAll(null, tags));
    }

    @Test
    void testAfterTagSave_TagNameChanged() {
        // Arrange
        Tag originalTag = createTestTag("tag-1", "OldName");
        Tag updatedTag = createTestTag("tag-1", "NewName");
        
        // Simulate the @Before aspect behavior by calling it directly
        aspect.beforeTagSave(null, originalTag);
        
        List<String> machineIds = Arrays.asList("machine-1", "machine-2");
        Machine machine1 = createTestMachine("machine-1", "org-1");
        Machine machine2 = createTestMachine("machine-2", "org-1");

        when(machineTagRepository.findByTagId("tag-1"))
            .thenReturn(Arrays.asList(
                createTestMachineTag("machine-1", "tag-1"),
                createTestMachineTag("machine-2", "tag-1")
            ));
        when(machineRepository.findByMachineId("machine-1"))
            .thenReturn(Optional.of(machine1));
        when(machineRepository.findByMachineId("machine-2"))
            .thenReturn(Optional.of(machine2));
        when(machineTagRepository.findByMachineId("machine-1"))
            .thenReturn(List.of(createTestMachineTag("machine-1", "tag-1")));
        when(machineTagRepository.findByMachineId("machine-2"))
            .thenReturn(List.of(createTestMachineTag("machine-2", "tag-1")));
        when(tagRepository.findAllById(List.of("tag-1")))
            .thenReturn(List.of(updatedTag));

        // Act
        aspect.afterTagSave(null, updatedTag, updatedTag);

        // Assert
        // Should send messages for both affected machines
        verify(kafkaProducer, times(2)).sendMessage(
            eq("pinot-events"),
            anyString(),
            any(MachinePinotMessage.class)
        );
    }

    @Test
    void testAfterTagSave_TagNameUnchanged() {
        // Arrange
        Tag originalTag = createTestTag("tag-1", "SameName");
        Tag updatedTag = createTestTag("tag-1", "SameName");
        
        // Simulate the @Before aspect behavior
        aspect.beforeTagSave(null, originalTag);

        // Act
        aspect.afterTagSave(null, updatedTag, updatedTag);

        // Assert
        // Should not send any messages since name didn't change
        verify(kafkaProducer, never()).sendMessage(
            anyString(),
            anyString(),
            any(MachinePinotMessage.class)
        );
    }

    @Test
    void testAfterTagSaveAll_MultipleTags() {
        // Arrange
        Tag tag1 = createTestTag("tag-1", "Tag1");
        Tag tag2 = createTestTag("tag-2", "Tag2");
        List<Tag> tags = Arrays.asList(tag1, tag2);
        
        // Simulate the @Before aspect behavior for both tags
        aspect.beforeTagSaveAll(null, tags);

        // Act
        aspect.afterTagSaveAll(null, tags, tags);

        // Assert
        // Should not send any messages since no names changed
        verify(kafkaProducer, never()).sendMessage(
            anyString(),
            anyString(),
            any(MachinePinotMessage.class)
        );
    }

    @Test
    void testErrorHandling_MachineNotFound() {
        // Arrange
        Machine machine = createTestMachine("machine-1", "org-1");
        when(machineTagRepository.findByMachineId("machine-1"))
            .thenThrow(new RuntimeException("Database error"));

        // Act & Assert
        assertDoesNotThrow(() -> {
            aspect.afterMachineSave(null, machine, machine);
        });

        // Should not send any messages due to error
        verify(kafkaProducer, never()).sendMessage(
            anyString(),
            anyString(),
            any(MachinePinotMessage.class)
        );
    }

    @Test
    void testErrorHandling_MachineTagMachineNotFound() {
        // Arrange
        MachineTag machineTag = createTestMachineTag("machine-1", "tag-1");
        when(machineRepository.findByMachineId("machine-1"))
            .thenReturn(Optional.empty());

        // Act & Assert
        assertDoesNotThrow(() -> {
            aspect.afterMachineTagSave(null, machineTag, machineTag);
        });

        // Should not send any messages due to error
        verify(kafkaProducer, never()).sendMessage(
            anyString(),
            anyString(),
            any(MachinePinotMessage.class)
        );
    }

    @Test
    void testErrorHandling_TagNoAffectedMachines() {
        // Arrange
        Tag originalTag = createTestTag("tag-1", "OldName");
        Tag updatedTag = createTestTag("tag-1", "NewName");
        
        // Simulate the @Before aspect behavior
        aspect.beforeTagSave(null, originalTag);
        
        // No machines are affected by this tag
        when(machineTagRepository.findByTagId("tag-1"))
            .thenReturn(List.of());

        // Act & Assert
        assertDoesNotThrow(() -> {
            aspect.afterTagSave(null, updatedTag, updatedTag);
        });

        // Should not send any messages since no machines are affected
        verify(kafkaProducer, never()).sendMessage(
            anyString(),
            anyString(),
            any(MachinePinotMessage.class)
        );
    }

    @Test
    void testBeforeTagSave_HandlesNullTag() {
        // Arrange
        Tag nullTag = null;

        // Act & Assert
        assertDoesNotThrow(() -> {
            aspect.beforeTagSave(null, nullTag);
        });
    }

    @Test
    void testBeforeTagSave_HandlesTagWithoutId() {
        // Arrange
        Tag tagWithoutId = createTestTag(null, "NewTag");

        // Act & Assert
        assertDoesNotThrow(() -> {
            aspect.beforeTagSave(null, tagWithoutId);
        });
    }

    @Test
    void testBeforeTagSaveAll_HandlesEmptyList() {
        // Arrange
        List<Tag> emptyTags = List.of();

        // Act & Assert
        assertDoesNotThrow(() -> {
            aspect.beforeTagSaveAll(null, emptyTags);
        });
    }

    @Test
    void testBeforeTagSaveAll_HandlesNullList() {
        // Arrange
        List<Tag> nullTags = null;

        // Act & Assert
        assertDoesNotThrow(() -> {
            aspect.beforeTagSaveAll(null, nullTags);
        });
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