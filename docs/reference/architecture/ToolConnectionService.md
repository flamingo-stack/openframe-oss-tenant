# ToolConnectionService Documentation

## Overview
The `ToolConnectionService` is responsible for managing tool connections for various machines. It provides methods to retrieve tool connections based on machine IDs, enabling the integration of tools within the OpenFrame platform.

## Core Methods
1. **getToolConnectionsForMachines(List<String> machineIds)**: Retrieves a list of tool connections for multiple machines.
   - **Parameters**: `machineIds` - A list of machine IDs.
   - **Returns**: A list of lists containing tool connections for each machine.

2. **getToolConnectionsForMachine(String machineId)**: Retrieves tool connections for a specific machine.
   - **Parameters**: `machineId` - The ID of the machine.
   - **Returns**: A list of tool connections for the specified machine.