# InstalledAgentService Documentation

## Overview
The `InstalledAgentService` is responsible for managing installed agents on various machines. It provides methods to retrieve installed agents based on different criteria, facilitating the management of agents within the OpenFrame ecosystem.

## Core Methods
1. **getInstalledAgentsForMachines(List<String> machineIds)**: Retrieves a list of installed agents for multiple machines.
   - **Parameters**: `machineIds` - A list of machine IDs.
   - **Returns**: A list of lists containing installed agents for each machine.

2. **getInstalledAgentsForMachine(String machineId)**: Retrieves installed agents for a specific machine.
   - **Parameters**: `machineId` - The ID of the machine.
   - **Returns**: A list of installed agents for the specified machine.

3. **getAllInstalledAgents()**: Retrieves all installed agents in the system.
   - **Returns**: A list of all installed agents.

4. **getInstalledAgent(String id)**: Retrieves a specific installed agent by its ID.
   - **Parameters**: `id` - The ID of the installed agent.
   - **Returns**: An optional installed agent object.

5. **getInstalledAgentByMachineIdAndType(String machineId, String agentType)**: Retrieves an installed agent for a specific machine and type.
   - **Parameters**: `machineId` - The ID of the machine, `agentType` - The type of the agent.
   - **Returns**: An optional installed agent object.