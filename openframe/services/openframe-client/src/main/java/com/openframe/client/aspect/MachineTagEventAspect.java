package com.openframe.client.aspect;

import com.openframe.client.service.MachineTagEventService;
import com.openframe.core.model.Machine;
import com.openframe.core.model.MachineTag;
import com.openframe.core.model.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.AfterReturning;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.springframework.stereotype.Component;

import java.util.concurrent.ConcurrentHashMap;

/**
 * AOP aspect to intercept repository save operations and delegate to RepositoryEventService.
 * Handles Machine, MachineTag, and Tag entity changes.
 */
@Aspect
@Component
@Slf4j
@RequiredArgsConstructor
public class MachineTagEventAspect {

    private final MachineTagEventService machineTagEventService;
    private final ConcurrentHashMap<String, Tag> originalTagStates = new ConcurrentHashMap<>();
    /**
     * Intercepts Machine repository save operations.
     */
    @AfterReturning(
            pointcut = "execution(* com.openframe.data.repository.mongo.MachineRepository.save(..)) && args(machine)",
            returning = "result",
            argNames = "joinPoint,machine,result"
    )
    public void afterMachineSave(JoinPoint joinPoint, Object machine, Object result) {
        try {
            log.debug("Machine save operation detected, delegating to service");
            Machine machineEntity = (Machine) machine;
            machineTagEventService.processMachineSave(machineEntity);
        } catch (Exception e) {
            log.error("Error in afterMachineSave aspect: {}", e.getMessage(), e);
        }
    }

    /**
     * Intercepts Machine repository saveAll operations.
     * Delegates to RepositoryEventService for processing.
     */
    @AfterReturning(
            pointcut = "execution(* com.openframe.data.repository.mongo.MachineRepository.saveAll(..)) && args(machines)",
            returning = "result",
            argNames = "joinPoint,machines,result"
    )
    public void afterMachineSaveAll(JoinPoint joinPoint, Object machines, Object result) {
        try {
            log.debug("Machine saveAll operation detected, delegating to service");
            Iterable<Machine> machineEntities = (Iterable<Machine>) machines;
            machineTagEventService.processMachineSaveAll(machineEntities);
        } catch (Exception e) {
            log.error("Error in afterMachineSaveAll aspect: {}", e.getMessage(), e);
        }
    }

    /**
     * Intercepts MachineTag repository save operations.
     */
    @AfterReturning(
            pointcut = "execution(* com.openframe.data.repository.mongo.MachineTagRepository.save(..)) && args(machineTag)",
            returning = "result",
            argNames = "joinPoint,machineTag,result"
    )
    public void afterMachineTagSave(JoinPoint joinPoint, Object machineTag, Object result) {
        try {
            log.debug("MachineTag save operation detected, delegating to service");
            MachineTag machineTagEntity = (MachineTag) machineTag;
            machineTagEventService.processMachineTagSave(machineTagEntity);
        } catch (Exception e) {
            log.error("Error in afterMachineTagSave aspect: {}", e.getMessage(), e);
        }
    }

    /**
     * Intercepts MachineTag repository saveAll operations.
     */
    @AfterReturning(
            pointcut = "execution(* com.openframe.data.repository.mongo.MachineTagRepository.saveAll(..)) && args(machineTags)",
            returning = "result",
            argNames = "joinPoint,machineTags,result"
    )
    public void afterMachineTagSaveAll(JoinPoint joinPoint, Object machineTags, Object result) {
        try {
            log.debug("MachineTag saveAll operation detected, delegating to service");
            Iterable<MachineTag> machineTagEntities = (Iterable<MachineTag>) machineTags;
            machineTagEventService.processMachineTagSaveAll(machineTagEntities);
        } catch (Exception e) {
            log.error("Error in afterMachineTagSaveAll aspect: {}", e.getMessage(), e);
        }
    }

    /**
     * Captures original tag state before save operation.
     */
    @Before("execution(* com.openframe.data.repository.mongo.TagRepository.save(..)) && args(tag)")
    public void beforeTagSave(JoinPoint joinPoint, Object tag) {
        try {
            log.debug("Tag save operation detected (before), delegating to service");
            Tag tagEntity = (Tag) tag;

            // Only capture state if this is an update operation (tag has an ID)
            if (tagEntity.getId() != null) {
                originalTagStates.put(tagEntity.getId(), tagEntity);
                log.debug("Captured original tag state for ID: {}", tagEntity.getId());
            }
        } catch (Exception e) {
            log.error("Error capturing original tag state: {}", e.getMessage(), e);
        }
    }

    /**
     * Captures original tag states before saveAll operation.
     */
    @Before("execution(* com.openframe.data.repository.mongo.TagRepository.saveAll(..)) && args(tags)")
    public void beforeTagSaveAll(JoinPoint joinPoint, Object tags) {
        try {
            Iterable<Tag> tagEntities = (Iterable<Tag>) tags;
            // Store original tag states for comparison after save
            for (Tag tag : tagEntities) {
                if (tag.getId() != null) {
                    originalTagStates.put(tag.getId(), tag);
                    log.debug("Captured original tag state for ID: {}", tag.getId());
                }
            }
        } catch (Exception e) {
            log.error("Error capturing original tag states: {}", e.getMessage(), e);
        }
    }

    /**
     * Intercepts Tag repository save operations.
     */
    @AfterReturning(
            pointcut = "execution(* com.openframe.data.repository.mongo.TagRepository.save(..)) && args(tag)",
            returning = "result",
            argNames = "joinPoint,tag,result"
    )
    public void afterTagSave(JoinPoint joinPoint, Object tag, Object result) {
        try {
            log.debug("Tag save operation detected, delegating to service");
            Tag tagEntity = (Tag) tag;
            if (tagEntity.getId() != null) {
                Tag originalTag = originalTagStates.remove(tagEntity.getId());
                if (originalTag != null) {
                    machineTagEventService.processTagSave(tagEntity);
                }
            }
        } catch (Exception e) {
            log.error("Error in afterTagSave aspect: {}", e.getMessage(), e);
        }
    }

    /**
     * Intercepts Tag repository saveAll operations.
     */
    @AfterReturning(
            pointcut = "execution(* com.openframe.data.repository.mongo.TagRepository.saveAll(..)) && args(tags)",
            returning = "result",
            argNames = "joinPoint,tags,result"
    )
    public void afterTagSaveAll(JoinPoint joinPoint, Object tags, Object result) {
        try {
            log.debug("Tag saveAll operation detected, delegating to service");
            Iterable<Tag> tagEntities = (Iterable<Tag>) tags;
            for (Tag tag : tagEntities) {
                if (tag.getId() != null) {
                    Tag originalTag = originalTagStates.remove(tag.getId());
                    if (originalTag != null) {
                        machineTagEventService.processTagSave(tag);
                    }
                }
            }
        } catch (Exception e) {
            log.error("Error in afterTagSaveAll aspect: {}", e.getMessage(), e);
        }
    }

} 