package com.openframe.client.service;

import com.openframe.core.model.Machine;
import com.openframe.core.model.MachineTag;
import com.openframe.core.model.Tag;
import com.openframe.core.model.device.DeviceStatus;
import com.openframe.core.model.device.DeviceType;
import com.openframe.core.model.device.SecurityState;
import com.openframe.core.model.device.ComplianceState;
import com.openframe.data.repository.mongo.MachineRepository;
import com.openframe.data.repository.mongo.MachineTagRepository;
import com.openframe.data.repository.mongo.TagRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;

@Service
@RequiredArgsConstructor
public class FakeDataGenerator {

    private final MachineRepository machineRepository;
    private final TagRepository tagRepository;
    private final MachineTagRepository machineTagRepository;
    private final Random random = new Random();

    private static final String[] MANUFACTURERS = {"Dell", "HP", "Lenovo", "Apple", "Microsoft", "ASUS", "Acer"};
    private static final String[] MODELS = {
            "Latitude 5420", "ThinkPad X1", "MacBook Pro", "Surface Laptop", "EliteBook 840",
            "ZenBook Pro", "Swift 3", "Inspiron 15", "Yoga 9i", "ProBook 450"
    };
    private static final String[] OS_TYPES = {"Windows", "macOS", "Linux"};
    private static final String[] OS_VERSIONS = {
            "Windows 11", "Windows 10", "macOS Sonoma", "macOS Ventura", "Ubuntu 22.04",
            "Fedora 38", "Debian 12", "CentOS 9"
    };
    private static final String[] COLORS = {"BLACK", "RED", "GREEN", "YELLOW", "BLUE", "MAGENTA", "CYAN", "WHITE"};

    /**
     * Generates specified number of fake machines with random IDs
     *
     * @param count number of machines to generate
     * @return report about created machines
     */
    public String generateFakeMachines(int count) {
        List<Machine> machines = new ArrayList<>();

        for (int i = 0; i < count; i++) {
            Machine machine = new Machine();

            // Generate random machine ID using UUID
            String machineId = "MachineID-" + UUID.randomUUID().toString().substring(0, 8);
            machine.setMachineId(machineId);
            machine.setHostname("host-" + machineId.substring(0, 8));
            machine.setOrganizationId("org-" + random.nextInt(5));

            machine.setIp("192.168." + random.nextInt(256) + "." + random.nextInt(256));
            machine.setMacAddress(generateMacAddress());
            machine.setOsUuid(UUID.randomUUID().toString());
            machine.setAgentVersion("1." + random.nextInt(10) + "." + random.nextInt(100));

            machine.setDisplayName("Device " + (i + 1));
            machine.setSerialNumber("SN" + UUID.randomUUID().toString().substring(0, 8));
            machine.setManufacturer(MANUFACTURERS[random.nextInt(MANUFACTURERS.length)]);
            machine.setModel(MODELS[random.nextInt(MODELS.length)]);

            machine.setType(DeviceType.values()[random.nextInt(DeviceType.values().length)]);
            machine.setOsType(OS_TYPES[random.nextInt(OS_TYPES.length)]);
            machine.setOsVersion(OS_VERSIONS[random.nextInt(OS_VERSIONS.length)]);
            machine.setOsBuild("Build " + random.nextInt(10000));
            machine.setTimezone("UTC+" + random.nextInt(13));

            DeviceStatus[] statuses = DeviceStatus.values();
            machine.setStatus(statuses[random.nextInt(statuses.length)]);
            machine.setLastSeen(Instant.now().minusSeconds(random.nextInt(86400))); // Random time in last 24h

            machine.setSecurityState(SecurityState.values()[random.nextInt(SecurityState.values().length)]);
            machine.setComplianceState(ComplianceState.values()[random.nextInt(ComplianceState.values().length)]);
            machine.setSecurityAlerts(new ArrayList<>());
            machine.setComplianceRequirements(new ArrayList<>());

            Instant registeredAt = Instant.now().minusSeconds(random.nextInt(30 * 24 * 3600)); // Random time in last 30 days
            machine.setRegisteredAt(registeredAt);
            machine.setUpdatedAt(registeredAt.plusSeconds(random.nextInt(24 * 3600))); // Random update within 24h of registration

            machines.add(machine);
        }

        List<Machine> savedMachines = new ArrayList<>();
        machines.forEach(it -> {
            savedMachines.add(machineRepository.save(it));
        });
        return "Successfully generated " + savedMachines.size() + " fake machines";
    }

    /**
     * Generates specified number of fake tags with random IDs
     *
     * @param count number of tags to generate
     * @return report about created tags
     */
    public String generateFakeTags(int count) {
        List<Tag> tags = new ArrayList<>();

        for (int i = 0; i < count; i++) {
            Tag tag = new Tag();

            // Generate random tag ID using UUID
            String tagId = "TagID-" + UUID.randomUUID().toString().substring(0, 8);
            tag.setId(tagId);
            tag.setName("tag-" + tagId);
            tag.setDescription("description-" + tagId);
            tag.setCreatedAt(Instant.now().minusSeconds(random.nextInt(24 * 3600)));
            tag.setColor(COLORS[random.nextInt(COLORS.length)]);
            tag.setCreatedBy(UUID.randomUUID().toString());
            tag.setOrganizationId("org-" + random.nextInt(5));
            tags.add(tag);
        }

        List<Tag> savedTags = new ArrayList<>();
        tags.forEach(it -> {
            savedTags.add(tagRepository.save(it));
        });
        return "Successfully generated " + savedTags.size() + " fake tags";
    }

    public void generateFakeMachineTag(int count, int machineIdStartIndex, int machineIdEndIndex, int tagIdStartIndex, int tagIdEndIndex) {

        List<MachineTag> machineTags = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            int k = random.nextInt(2);
            String machineId = "MachineID" + random.nextInt(machineIdStartIndex, machineIdEndIndex);
            for (int j = 0; j < k; j++) {
                String tagId = "TagID" + random.nextInt(tagIdStartIndex, tagIdEndIndex);
                String id = UUID.randomUUID().toString();
                MachineTag machineTag = new MachineTag();
                machineTag.setId(id);
                machineTag.setMachineId(machineId);
                machineTag.setTagId(tagId);
                machineTags.add(machineTag);
            }
        }
        machineTags.forEach(it -> {
            machineTagRepository.save(it);
        });
    }

    /**
     * Links existing machines with tags randomly
     *
     * @param maxTagsPerMachine maximum number of tags per machine (default: 3)
     * @return report about created machine-tag links
     */
    public String linkMachinesWithTags(int maxTagsPerMachine) {
        // Get all machines and tags from database
        List<Machine> allMachines = machineRepository.findAll();
        List<Tag> allTags = tagRepository.findAll();

        if (allMachines.isEmpty() || allTags.isEmpty()) {
            return "No machines or tags found in database. Please generate some data first.";
        }

        List<MachineTag> machineTags = new ArrayList<>();
        int machinesWithoutTags = 0;
        int totalLinksCreated = 0;

        // Calculate how many machines should remain without tags (15-30%)
        int machinesToLeaveUntagged = (int) (allMachines.size() * (0.15 + random.nextDouble() * 0.15));

        // Shuffle machines to randomize selection
        List<Machine> shuffledMachines = new ArrayList<>(allMachines);
        Collections.shuffle(shuffledMachines);

        for (int i = 0; i < shuffledMachines.size(); i++) {
            Machine machine = shuffledMachines.get(i);

            // Leave some machines without tags (first machines in shuffled list)
            if (i < machinesToLeaveUntagged) {
                machinesWithoutTags++;
                continue;
            }

            // Randomly assign 1 to maxTagsPerMachine tags to this machine
            int tagsToAssign = random.nextInt(maxTagsPerMachine) + 1;

            // Shuffle tags and take random subset
            List<Tag> shuffledTags = new ArrayList<>(allTags);
            Collections.shuffle(shuffledTags);

            for (int j = 0; j < Math.min(tagsToAssign, shuffledTags.size()); j++) {
                Tag tag = shuffledTags.get(j);

                // Check if this machine-tag link already exists
                boolean linkExists = machineTags.stream()
                        .anyMatch(mt -> mt.getMachineId().equals(machine.getMachineId())
                                && mt.getTagId().equals(tag.getId()));

                if (!linkExists) {
                    MachineTag machineTag = new MachineTag();
                    machineTag.setId(UUID.randomUUID().toString());
                    machineTag.setMachineId(machine.getMachineId());
                    machineTag.setTagId(tag.getId());
                    machineTags.add(machineTag);
                    totalLinksCreated++;
                }
            }
        }

        // Save all machine-tag links
        if (!machineTags.isEmpty()) {
            machineTags.forEach(it -> {
                machineTagRepository.save(it);
            });
        }

        return String.format("Successfully created %d machine-tag links. %d machines left without tags.",
                totalLinksCreated, machinesWithoutTags);
    }

    /**
     * Links existing machines with tags randomly (default max 3 tags per machine)
     *
     * @return report about created machine-tag links
     */
    public String linkMachinesWithTags() {
        return linkMachinesWithTags(3);
    }

    private String generateMacAddress() {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 6; i++) {
            sb.append(String.format("%02x", random.nextInt(256)));
            if (i < 5) sb.append(":");
        }
        return sb.toString();
    }

    /**
     * Generates complete dataset with machines, tags and their links
     *
     * @param machineCount number of machines to generate (default: 10)
     * @param tagCount     number of tags to generate (default: 20)
     * @return comprehensive report about all created data
     */
    public String generateCompleteDataset(int machineCount, int tagCount) {
        StringBuilder report = new StringBuilder();

        // Generate machines
        String machineReport = generateFakeMachines(machineCount);
        report.append(machineReport).append("\n");

        // Generate tags
        String tagReport = generateFakeTags(tagCount);
        report.append(tagReport).append("\n");

        // Link machines with tags
        String linkReport = linkMachinesWithTags(3);
        report.append(linkReport);

        return report.toString();
    }
}