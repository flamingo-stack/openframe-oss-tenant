package com.openframe.client.aspect;

import com.openframe.client.service.MachineTagEventService;
import com.openframe.data.document.device.Machine;
import com.openframe.data.document.device.MachineTag;
import com.openframe.data.document.tool.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.AfterReturning;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

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

    /**
     * Intercepts Machine repository save operations.
     */
    @AfterReturning(
            pointcut = "execution(* com.openframe.data.repository.device.MachineRepository.save(..)) && args(machine)",
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
            pointcut = "execution(* com.openframe.data.repository.device.MachineRepository.saveAll(..)) && args(machines)",
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
            pointcut = "execution(* com.openframe.data.repository.device.MachineTagRepository.save(..)) && args(machineTag)",
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
            pointcut = "execution(* com.openframe.data.repository.device.MachineTagRepository.saveAll(..)) && args(machineTags)",
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
     * Intercepts Tag repository save operations using @Around advice.
     * Captures original state before save and processes after successful save.
     */
    @Around("execution(* com.openframe.data.repository.tool.TagRepository.save(..)) && args(tag)")
    public Object aroundTagSave(ProceedingJoinPoint joinPoint, Object tag) throws Throwable {
        try {
            log.debug("Tag save operation detected, capturing state and delegating to service");
            Tag tagEntity = (Tag) tag;

            Tag result = (Tag) joinPoint.proceed();

            if (tagEntity != null && tagEntity.getId() != null) {
                machineTagEventService.processTagSave(tagEntity);
            }
            return result;
        } catch (Exception e) {
            log.error("Error in aroundTagSave aspect: {}", e.getMessage(), e);
            throw e;
        }
    }

    /**
     * Intercepts Tag repository saveAll operations using @Around advice.
     * Captures original states before save and processes after successful save.
     */
    @Around("execution(* com.openframe.data.repository.tool.TagRepository.saveAll(..)) && args(tags)")
    public Object aroundTagSaveAll(ProceedingJoinPoint joinPoint, Object tags) throws Throwable {
        try {
            log.debug("Tag saveAll operation detected, capturing states and delegating to service");
            Iterable<Tag> tagEntities = (Iterable<Tag>) tags;

            Map<String, Tag> originalTags = new HashMap<>();
            for (Tag tag : tagEntities) {
                if (tag.getId() != null) {
                    originalTags.put(tag.getId(), tag);
                    log.debug("Captured original tag state for ID: {}", tag.getId());
                }
            }

            Iterable<Tag> results = (Iterable<Tag>) joinPoint.proceed();

            for (Tag tag : results) {
                if (originalTags.containsKey(tag.getId())) {
                    machineTagEventService.processTagSave(tag);
                }
            }
            return results;
        } catch (Exception e) {
            log.error("Error in aroundTagSaveAll aspect: {}", e.getMessage(), e);
            throw e;
        }
    }
} 