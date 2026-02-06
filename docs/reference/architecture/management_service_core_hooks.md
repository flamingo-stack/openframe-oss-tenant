# Management Service Core – Hooks

## Overview

Hooks provide lightweight extension points without introducing heavy eventing or coupling.

They are designed for service-specific side-effects that should occur after core operations complete.

---

## IntegratedToolPostSaveHook

### Purpose

Invoked after an **IntegratedTool** has been saved.

### Interface

```java
public interface IntegratedToolPostSaveHook {
    void onToolSaved(String toolId, IntegratedTool tool);
}
```

### Usage

- Automatically invoked by **IntegratedToolController** after persistence
- Multiple hook implementations can be registered
- Failures in one hook do not block others

### Typical Use Cases

- Provision external resources
- Trigger asynchronous jobs
- Update caches or downstream systems

---

## Design Principles

- No Spring event overhead
- Explicit invocation for predictability
- Best-effort execution with isolated failure handling

Hooks keep the core management logic clean while allowing controlled extensibility.
