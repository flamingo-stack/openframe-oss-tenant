# Frontend MeshCentral Integration Module

## Overview

The **frontend_meshcentral** module provides a comprehensive TypeScript implementation for integrating MeshCentral remote desktop and file management capabilities into the OpenFrame frontend. This module enables real-time remote desktop control, file transfer operations, and multi-display management through WebSocket-based binary protocol communication with MeshCentral servers.

**Key Capabilities:**
- **Remote Desktop Control**: Full keyboard, mouse, and display interaction with remote machines
- **Multi-Display Support**: Detection, switching, and management of multiple monitors
- **Binary Protocol Implementation**: Low-level MeshCentral KVM (Keyboard-Video-Mouse) protocol encoding/decoding
- **File Manager Integration**: Type definitions and interfaces for file operations (see companion file manager implementation)
- **High-Performance Rendering**: Tile-based JPEG decoding with concurrent processing and backpressure management
- **Input Handling**: Complete keyboard mapping including extended keys, modifiers, and special key combinations

---

## Architecture Overview

```mermaid
flowchart TD
    subgraph Frontend["OpenFrame Frontend"]
        UI["React UI Components"]
        MeshDesktop["MeshDesktop Class"]
        FileTypes["File Manager Types"]
    end
    
    subgraph Protocol["Binary Protocol Layer"]
        Encoder["Input Encoders"]
        Decoder["Frame Decoder"]
        DisplayMgr["Display Manager"]
    end
    
    subgraph Rendering["Rendering Pipeline"]
        TileQueue["Tile Queue"]
        ImageDecoder["JPEG Decoder"]
        Canvas["HTML5 Canvas"]
    end
    
    subgraph MeshCentral["MeshCentral Server"]
        KVM["KVM Protocol Handler"]
        FileService["File Service"]
        Agent["MeshAgent on Device"]
    end
    
    UI -->|"attach(canvas)"| MeshDesktop
    MeshDesktop -->|"Mouse/Keyboard Events"| Encoder
    MeshDesktop -->|"Binary Frames"| Decoder
    
    Encoder -->|"Binary Commands"| KVM
    KVM -->|"Screen Tiles"| Decoder
    
    Decoder -->|"Tile Data"| TileQueue
    TileQueue -->|"Decode"| ImageDecoder
    ImageDecoder -->|"Draw"| Canvas
    
    DisplayMgr -->|"Display List"| KVM
    KVM -->|"Display Info"| DisplayMgr
    
    FileTypes -.->|"Type Definitions"| FileService
    
    Agent -->|"Desktop Stream"| KVM
    Agent -->|"File Operations"| FileService
```

---

## Core Components

### 1. MeshDesktop Class

**Location**: `openframe/services/openframe-frontend/src/lib/meshcentral/meshcentral-desktop.ts`

The main class implementing remote desktop control and rendering.

#### Key Responsibilities

```mermaid
flowchart LR
    MeshDesktop["MeshDesktop"]
    
    MeshDesktop --> InputCapture["Input Capture"]
    MeshDesktop --> ProtocolEncode["Protocol Encoding"]
    MeshDesktop --> FrameDecode["Frame Decoding"]
    MeshDesktop --> Rendering["Canvas Rendering"]
    MeshDesktop --> DisplayMgmt["Display Management"]
    
    InputCapture --> Mouse["Mouse Events"]
    InputCapture --> Keyboard["Keyboard Events"]
    
    ProtocolEncode --> MouseCmd["Mouse Commands"]
    ProtocolEncode --> KeyCmd["Key Commands"]
    ProtocolEncode --> CtrlCmd["Control Commands"]
    
    FrameDecode --> ScreenSize["Screen Size"]
    FrameDecode --> Tiles["JPEG Tiles"]
    FrameDecode --> DisplayList["Display List"]
    
    Rendering --> TileQueue["Tile Queue"]
    Rendering --> Decode["JPEG Decode"]
    Rendering --> Draw["Canvas Draw"]
```

#### Public Interface

```typescript
interface DesktopInputHandlers {
  // Lifecycle
  attach(canvas: HTMLCanvasElement): void
  detach(): void
  
  // Configuration
  setViewOnly(viewOnly: boolean): void
  
  // Control Commands
  sendCtrlAltDel?(): void
  sendKeyCombo?(combo: string): void
  requestRefresh?(): void
  
  // Multi-Display
  requestDisplayList?(): void
  switchDisplay?(displayId: number): void
  getDisplayList?(): DisplayInfo[]
  onDisplayListChange?(callback: (displays: DisplayInfo[]) => void): void
}
```

#### Display Information

```typescript
interface DisplayInfo {
  id: number          // Display identifier
  x: number           // X position in virtual desktop
  y: number           // Y position in virtual desktop
  w: number           // Width in pixels
  h: number           // Height in pixels
  primary: boolean    // Primary display flag
}
```

---

### 2. Binary Protocol Implementation

#### Protocol Commands

The module implements the MeshCentral KVM binary protocol with the following command structure:

```mermaid
flowchart TD
    subgraph StandardFrame["Standard Frame (4 bytes header)"]
        Cmd1["Bytes 0-1: Command (uint16 BE)"]
        Size1["Bytes 2-3: Size (uint16 BE)"]
        Payload1["Bytes 4+: Payload"]
    end
    
    subgraph JumboFrame["Jumbo Frame (8 bytes shim)"]
        Cmd2["Bytes 0-1: 0x001B (27)"]
        Size2["Bytes 2-3: 0x0008"]
        JumboSize["Bytes 5-7: Size (24-bit)"]
        RealCmd["Bytes 8-9: Real Command"]
        Payload2["Bytes 10+: Payload"]
    end
    
    StandardFrame -.->|"Size > 65535"| JumboFrame
```

#### Command Reference

| Command | Code | Direction | Description |
|---------|------|-----------|-------------|
| **MNG_KVM_KEY** | 0x0001 | Client → Server | Keyboard event (down/up) |
| **MNG_KVM_MOUSE** | 0x0002 | Client → Server | Mouse movement/button |
| **MNG_KVM_TILE** | 0x0003 | Server → Client | JPEG tile data |
| **COMPRESSION** | 0x0005 | Client → Server | Set compression settings |
| **REFRESH** | 0x0006 | Client → Server | Request screen refresh |
| **SCREEN_SIZE** | 0x0007 | Server → Client | Screen dimensions |
| **PAUSE** | 0x0008 | Client → Server | Pause/unpause stream |
| **CTRLALTDEL** | 0x000A | Client → Server | Send Ctrl+Alt+Del |
| **DISPLAY_LIST** | 0x000B | Bidirectional | Request/receive display list |
| **SWITCH_DISPLAY** | 0x000C | Client → Server | Switch active display |
| **KVM_INIT** | 0x000E | Client → Server | Initialize desktop session |
| **JUMBO_SHIM** | 0x001B (27) | Both | Wrapper for large frames |
| **DISPLAY_LOCATION** | 0x0052 (82) | Server → Client | Display position info |

---

### 3. Input Encoding

#### Mouse Protocol

```typescript
// Mouse Message Format (10 bytes)
// Byte 0-1: Command (0x0002)
// Byte 2-3: Size (0x000A)
// Byte 4-5: Reserved (0x0000)
// Byte 6: Button state
// Byte 7-8: X coordinate (uint16 BE)
// Byte 9-10: Y coordinate (uint16 BE)

// Button State Flags
const MouseButtons = {
  LEFT_DOWN: 0x02,
  LEFT_UP: 0x04,
  RIGHT_DOWN: 0x08,
  RIGHT_UP: 0x10,
  MIDDLE_DOWN: 0x20,
  MIDDLE_UP: 0x40,
  DOUBLE_CLICK: 0x88
}
```

#### Keyboard Protocol

```typescript
// Key Message Format (6 bytes)
// Byte 0-1: Command (0x0001)
// Byte 2-3: Size (0x0006)
// Byte 4: Action
// Byte 5: Virtual Key Code

// Action Codes
const KeyActions = {
  DOWN: 0,           // Normal key down
  UP: 1,             // Normal key up
  EXTENDED_UP: 3,    // Extended key up
  EXTENDED_DOWN: 4   // Extended key down
}
```

#### Virtual Key Mapping

The module implements comprehensive Windows Virtual Key Code mapping:

```mermaid
flowchart TD
    KeyEvent["KeyboardEvent"]
    
    KeyEvent --> CodeCheck{"e.code exists?"}
    CodeCheck -->|Yes| CodeMap["convertKeyCode()"]
    CodeCheck -->|No| FallbackMap["mapKeyToVirtualKey()"]
    
    CodeMap --> KeyType{"Key Type?"}
    KeyType -->|"Key[A-Z]"| Letter["ASCII Code"]
    KeyType -->|"Digit[0-9]"| Digit["ASCII Code"]
    KeyType -->|"F[1-12]"| Function["0x70 + n"]
    KeyType -->|"Numpad[0-9]"| Numpad["0x60 + n"]
    KeyType -->|Other| LookupTable["Lookup Table"]
    
    FallbackMap --> KeyName["e.key lookup"]
    
    Letter --> VK["Virtual Key Code"]
    Digit --> VK
    Function --> VK
    Numpad --> VK
    LookupTable --> VK
    KeyName --> VK
    
    VK --> Extended{"Extended Key?"}
    Extended -->|Yes| ExtFlag["Set Extended Flag"]
    Extended -->|No| Encode["Encode Message"]
    ExtFlag --> Encode
```

**Extended Keys** (require special flag):
- Right-side modifiers: `ShiftRight`, `AltRight`, `ControlRight`
- Navigation: `Home`, `End`, `Insert`, `Delete`, `PageUp`, `PageDown`
- Arrow keys: `ArrowLeft`, `ArrowUp`, `ArrowRight`, `ArrowDown`
- Numpad: `NumpadDivide`, `NumpadEnter`
- System: `NumLock`, `Pause`, `MetaLeft`, `MetaRight`

---

### 4. Frame Decoding Pipeline

```mermaid
flowchart TD
    BinaryFrame["Binary Frame Received"]
    
    BinaryFrame --> Accumulator["Accumulator Buffer"]
    Accumulator --> HeaderCheck{"Enough bytes<br/>for header?"}
    
    HeaderCheck -->|No| Wait["Wait for more data"]
    HeaderCheck -->|Yes| ParseHeader["Parse Header"]
    
    ParseHeader --> JumboCheck{"Jumbo Frame?<br/>(cmd=27, size=8)"}
    JumboCheck -->|Yes| JumboHeader["Parse Jumbo Header<br/>(24-bit size)"]
    JumboCheck -->|No| StandardHeader["Use Standard Header"]
    
    JumboHeader --> FrameComplete{"Full frame<br/>available?"}
    StandardHeader --> FrameComplete
    
    FrameComplete -->|No| Wait
    FrameComplete -->|Yes| CommandSwitch{"Command Type?"}
    
    CommandSwitch -->|"7 (SCREEN_SIZE)"| ScreenSize["Update Canvas Size"]
    CommandSwitch -->|"3 (TILE)"| TileData["Extract JPEG Tile"]
    CommandSwitch -->|"11 (DISPLAY_LIST)"| DisplayList["Parse Display List"]
    CommandSwitch -->|"82 (DISPLAY_LOCATION)"| DisplayLoc["Parse Display Location"]
    
    TileData --> TileQueue["Add to Tile Queue"]
    TileQueue --> Backpressure{"Queue size<br/>> 300?"}
    Backpressure -->|Yes| DropOldest["Drop oldest tile"]
    Backpressure -->|No| Enqueue["Enqueue tile"]
    
    DropOldest --> KickDecoder["Kick Decoder"]
    Enqueue --> KickDecoder
    
    ScreenSize --> NextFrame["Process Next Frame"]
    DisplayList --> NextFrame
    DisplayLoc --> NextFrame
    KickDecoder --> NextFrame
    
    NextFrame --> Accumulator
```

#### Tile Decoding with Backpressure

```typescript
// Concurrent Decoding Configuration
const maxConcurrentDecodes = 3  // Parallel JPEG decoders
const maxQueueSize = 300        // Tile queue limit
const maxAccumBytes = 16 * 1024 * 1024  // 16MB buffer limit

// Decoding Flow
// 1. Tile arrives → Add to queue (drop oldest if full)
// 2. Kick decoders if slots available
// 3. Decode JPEG using createImageBitmap() or Image fallback
// 4. Add decoded bitmap to draw queue
// 5. Schedule RAF draw call
// 6. Draw all queued tiles in single frame
// 7. Release bitmap resources
```

---

### 5. Multi-Display Management

```mermaid
sequenceDiagram
    participant Client as MeshDesktop
    participant Server as MeshCentral
    participant Agent as MeshAgent
    
    Note over Client,Agent: Initialization
    Client->>Server: KVM_INIT (0x000E)
    Client->>Server: DISPLAY_LIST Request (0x000B)
    
    Server->>Agent: Query displays
    Agent->>Server: Display info
    Server->>Client: DISPLAY_LIST Response (0x000B)
    
    Note over Client: Parse display list<br/>Store in displayList[]
    
    Client->>Client: Trigger onDisplayListCallback
    
    Note over Client,Agent: Display Switching
    Client->>Server: PAUSE (0x0008, pause=1)
    Client->>Server: SWITCH_DISPLAY (0x000C, displayId)
    Client->>Server: PAUSE (0x0008, pause=0)
    Client->>Server: REFRESH (0x0006)
    
    Server->>Agent: Switch display
    Agent->>Server: New display stream
    Server->>Client: SCREEN_SIZE (0x0007)
    Server->>Client: TILE frames (0x0003)
    
    Note over Client: Render new display
```

#### Display List Parsing

```typescript
// Display List Response Format
// Bytes 0-3: Header (cmd=11, size)
// Bytes 4-5: Display count (uint16 BE)
// Variable format based on bytes per display:

// Format 1: Simple IDs (2 bytes per display)
// - Bytes 0-1: Display ID

// Format 2: IDs + Flags (4 bytes per display)
// - Bytes 0-1: Display ID
// - Bytes 2-3: Flags (0xFFFF = primary)

// Format 3: Full Info (8-12 bytes per display)
// - Bytes 0-1: Display ID
// - Bytes 2-3: X position
// - Bytes 4-5: Y position
// - Bytes 6-7: Width (optional)
// - Bytes 8-9: Height (optional)
// - Bytes 10-11: Flags (bit 0 = primary)

// Special ID: 0xFFFF = "All Displays" view (mapped to ID 0)
```

---

### 6. File Manager Types

**Location**: `openframe/services/openframe-frontend/src/lib/meshcentral/file-manager-types.ts`

Type definitions for MeshCentral file operations (implementation in separate file manager module).

#### Core Types

```typescript
// Connection State Machine
type FileConnectionState = 
  | 'disconnected' 
  | 'connecting' 
  | 'connected_to_server' 
  | 'connected_end_to_end' 
  | 'failed'

// File Entry (from directory listing)
interface FileEntry {
  n: string           // Name
  t: number          // Type: 1=Link, 2=Directory, 3=File
  s?: number         // Size in bytes
  d?: number         // Modified date (Unix timestamp)
  nx?: string        // Normalized key (server supplied)
  dt?: string        // Drive type (FIXED, REMOVABLE, etc.)
  path?: string      // Absolute path
  icon?: string      // Icon hint
}

// Directory Listing Response
interface DirectoryListing {
  action: 'ls'
  reqid: string
  path: string
  dir: FileEntry[]
}
```

#### File Operations

```typescript
// Upload Request
interface UploadRequest {
  action: 'upload' | 'uploadhash'
  reqid: string
  path: string
  name: string
  size?: number
  append?: boolean
  tag?: {
    h?: string      // Hash for deduplication
    s?: number      // Size
    skip?: boolean  // Skip if exists
  }
}

// Download Request
interface DownloadRequest {
  action: 'download'
  sub: 'start' | 'startack' | 'ack' | 'cancel'
  id: string
  path: string
}

// Transfer Progress
interface FileTransferProgress {
  file: string
  progress: number
  bytesTransferred: number
  totalBytes: number
  type?: 'upload' | 'download'
}
```

#### Permissions

```typescript
// MeshCentral Rights System
const MeshRights = {
  SERVERFILES: 0x00000020,     // 32 - Server file access
  NOFILES: 0x00000400,         // 1024 - Block file access
}

const SiteRights = {
  FILEACCESS: 0x00000008,      // 8 - Site-level file access
}
```

---

## Integration with OpenFrame

### Component Hierarchy

```mermaid
flowchart TD
    subgraph UI["React UI Layer"]
        DevicePage["Device Detail Page"]
        RemoteDesktop["Remote Desktop Component"]
        FileManager["File Manager Component"]
    end
    
    subgraph Integration["Integration Layer"]
        MeshDesktop["MeshDesktop Instance"]
        FileClient["File Manager Client"]
        WSManager["WebSocket Manager"]
    end
    
    subgraph Backend["Backend Services"]
        Gateway["Gateway Service"]
        MeshServer["MeshCentral Server"]
    end
    
    DevicePage --> RemoteDesktop
    DevicePage --> FileManager
    
    RemoteDesktop --> MeshDesktop
    FileManager --> FileClient
    
    MeshDesktop --> WSManager
    FileClient --> WSManager
    
    WSManager -->|"Binary Protocol"| Gateway
    Gateway -->|"Proxy"| MeshServer
    
    MeshServer -->|"Agent Protocol"| Agent["MeshAgent on Device"]
```

### Usage Example

```typescript
import { MeshDesktop } from '@/lib/meshcentral/meshcentral-desktop'

// Initialize desktop controller
const desktop = new MeshDesktop()

// Configure WebSocket sender
desktop.setSender((data: Uint8Array) => {
  websocket.send(data)
})

// Attach to canvas
const canvas = document.getElementById('remote-desktop') as HTMLCanvasElement
desktop.attach(canvas)

// Configure options
desktop.setViewOnly(false)
desktop.setSwapMouseButtons(false)
desktop.setUseRemoteKeyboardMap(false)

// Handle display changes
desktop.onDisplayListChange((displays) => {
  console.log('Available displays:', displays)
  // Update UI with display selector
})

// Handle incoming binary frames
websocket.onmessage = (event) => {
  if (event.data instanceof ArrayBuffer) {
    desktop.onBinaryFrame(new Uint8Array(event.data))
  }
}

// Send control commands
desktop.sendCtrlAltDel()
desktop.sendKeyCombo('ctrl+alt+del')
desktop.requestRefresh()
desktop.switchDisplay(1)

// Cleanup
desktop.detach()
```

---

## Data Flow Diagrams

### Desktop Initialization Flow

```mermaid
sequenceDiagram
    participant UI as React Component
    participant Desktop as MeshDesktop
    participant WS as WebSocket
    participant Server as MeshCentral
    
    UI->>Desktop: new MeshDesktop()
    UI->>Desktop: setSender(ws.send)
    
    Note over Desktop: Auto-initialize on setSender
    
    Desktop->>Server: KVM_INIT (flags=0)
    Desktop->>Server: COMPRESSION (JPEG, quality=50)
    Desktop->>Server: PAUSE (unpause=0)
    Desktop->>Server: REFRESH
    Desktop->>Server: DISPLAY_LIST
    
    Server->>Desktop: SCREEN_SIZE (width, height)
    Desktop->>UI: Canvas resized
    
    Server->>Desktop: DISPLAY_LIST (displays[])
    Desktop->>UI: onDisplayListCallback
    
    Server->>Desktop: TILE (x, y, jpeg)
    Server->>Desktop: TILE (x, y, jpeg)
    Server->>Desktop: TILE (x, y, jpeg)
    
    Note over Desktop: Queue tiles for decode
    
    Desktop->>Desktop: Decode JPEG tiles
    Desktop->>Desktop: Draw to canvas
    
    UI->>Desktop: attach(canvas)
    Note over Desktop: Start capturing input
```

### Input Event Flow

```mermaid
sequenceDiagram
    participant User
    participant Canvas
    participant Desktop as MeshDesktop
    participant Encoder
    participant Server as MeshCentral
    
    User->>Canvas: Mouse Move
    Canvas->>Desktop: mousemove event
    Desktop->>Desktop: getRemoteXY()
    Desktop->>Encoder: encodeMouseMove(x, y)
    Encoder->>Server: Binary message (10 bytes)
    
    User->>Canvas: Key Down
    Canvas->>Desktop: keydown event
    Desktop->>Desktop: convertKeyCode()
    Desktop->>Desktop: isExtendedKey()
    Desktop->>Desktop: Track pressed key
    Desktop->>Encoder: encodeKeyEvent(DOWN, vk, ext)
    Encoder->>Server: Binary message (6 bytes)
    
    User->>Canvas: Key Up
    Canvas->>Desktop: keyup event
    Desktop->>Desktop: Find pressed key
    Desktop->>Desktop: Remove from tracking
    Desktop->>Encoder: encodeKeyEvent(UP, vk, ext)
    Encoder->>Server: Binary message (6 bytes)
    
    User->>Canvas: Mouse Click
    Canvas->>Desktop: mousedown event
    Desktop->>Desktop: mapMouseButton()
    Desktop->>Encoder: encodeMouseButton(btn, x, y)
    Encoder->>Server: Binary message (10 bytes)
```

### Tile Rendering Pipeline

```mermaid
flowchart LR
    subgraph Receive["Frame Reception"]
        WS["WebSocket"]
        Accum["Accumulator"]
        Parse["Parser"]
    end
    
    subgraph Queue["Tile Queue"]
        TQ["Tile Queue<br/>(max 300)"]
        BP["Backpressure<br/>Management"]
    end
    
    subgraph Decode["Concurrent Decoding"]
        D1["Decoder 1"]
        D2["Decoder 2"]
        D3["Decoder 3"]
    end
    
    subgraph Render["Rendering"]
        DrawQ["Draw Queue"]
        RAF["RequestAnimationFrame"]
        Canvas["Canvas Context"]
    end
    
    WS -->|"Binary"| Accum
    Accum -->|"Buffered"| Parse
    Parse -->|"Tile Data"| TQ
    TQ --> BP
    BP -->|"Drop oldest if full"| TQ
    
    TQ -.->|"Slot available"| D1
    TQ -.->|"Slot available"| D2
    TQ -.->|"Slot available"| D3
    
    D1 -->|"ImageBitmap"| DrawQ
    D2 -->|"ImageBitmap"| DrawQ
    D3 -->|"ImageBitmap"| DrawQ
    
    DrawQ -->|"Schedule"| RAF
    RAF -->|"Draw all"| Canvas
    Canvas -->|"Release"| Cleanup["Bitmap Cleanup"]
```

---

## Key Features

### 1. Keyboard Handling

**Comprehensive Virtual Key Mapping**:
- Alphanumeric keys (A-Z, 0-9)
- Function keys (F1-F12)
- Numpad keys (0-9, operators)
- Modifier keys (Shift, Ctrl, Alt, Meta/Win)
- Navigation keys (arrows, Home, End, PgUp, PgDn)
- Special keys (Tab, Enter, Escape, Backspace, Delete)
- Extended key detection for proper protocol encoding

**Key State Tracking**:
- Maintains list of pressed keys to handle window blur
- Releases all keys on window blur to prevent stuck keys
- Prevents key repeat events from duplicating key-down messages

**Predefined Key Combinations**:
```typescript
const supportedCombos = [
  'ctrl+c', 'ctrl+v', 'ctrl+a', 'ctrl+x', 'ctrl+z', 'ctrl+w',
  'alt+f4', 'alt+tab',
  'win+l', 'win+m', 'win+r', 'win+up', 'win+down',
  'shift+win+m', 'ctrl+shift+esc', 'ctrl+alt+del'
]
```

### 2. Mouse Handling

**Features**:
- Coordinate transformation from canvas to remote screen
- Button mapping with swap support (left/right button swap)
- Double-click detection
- Mouse wheel support with delta scaling
- Bounds checking (0-65535 coordinate range)

**Button Mapping**:
```typescript
// Normal mapping
Left Button:   0x02 (down), 0x04 (up)
Right Button:  0x08 (down), 0x10 (up)
Middle Button: 0x20 (down), 0x40 (up)

// Swapped mapping (for left-handed users)
Left Button:   0x08 (down), 0x10 (up)
Right Button:  0x02 (down), 0x04 (up)
```

### 3. Performance Optimizations

**Tile Queue Management**:
- Maximum 300 tiles in queue to prevent memory exhaustion
- Drop oldest tiles when queue is full (FIFO)
- Concurrent decoding with 3 parallel workers

**Accumulator Buffer**:
- 16MB maximum buffer size
- Handles partial frames across WebSocket messages
- Efficient byte array operations

**Rendering Optimization**:
- Single `requestAnimationFrame` per batch
- Batch drawing of all decoded tiles
- Immediate bitmap resource cleanup

**Backpressure Handling**:
```typescript
// Queue management strategy
if (tileQueue.length >= 300) {
  tileQueue.shift()  // Drop oldest
}
tileQueue.push(newTile)

// Decode slot management
while (activeDecodes < 3 && tileQueue.length > 0) {
  startDecode(tileQueue.shift())
}
```

### 4. Error Handling

**Graceful Degradation**:
- Try `createImageBitmap()` first (faster, hardware-accelerated)
- Fall back to `Image` element if `createImageBitmap()` fails
- Ignore malformed frames without crashing

**Resource Cleanup**:
- Detach removes all event listeners
- Clears tile and draw queues
- Releases bitmap resources
- Revokes object URLs

**State Management**:
- `stopped` flag prevents operations after detach
- Accumulator reset on buffer overflow
- Pressed keys cleared on window blur

---

## Configuration Options

### Desktop Configuration

```typescript
// View-only mode (disable input)
desktop.setViewOnly(true)

// Swap left/right mouse buttons
desktop.setSwapMouseButtons(true)

// Use remote keyboard layout (future feature)
desktop.setUseRemoteKeyboardMap(true)
```

### Compression Settings

```typescript
// Sent during initialization
interface CompressionSettings {
  type: 1 | 2 | 3 | 4    // 1=JPEG, 2=PNG, 3=TIFF, 4=WebP
  quality: 1-100         // Compression quality (50 recommended)
  scaling: number        // 1024=100%, 512=50%, etc.
  frameTimer: number     // Milliseconds between frames
}

// Default settings
const defaultCompression = {
  type: 1,        // JPEG
  quality: 50,    // Balanced quality/performance
  scaling: 1024,  // 100% scale
  frameTimer: 100 // 10 FPS
}
```

---

## Related Modules

### Frontend Modules
- **[frontend_main](frontend_main.md)**: Main frontend application structure
- **[frontend_api_clients](frontend_api_clients.md)**: API client implementations including MeshCentral control client
- **[frontend_device_management](frontend_device_management.md)**: Device management UI components

### Backend Services
- **[gateway_service](gateway_service.md)**: WebSocket proxy for MeshCentral connections
- **[client_service](client_service.md)**: Agent registration and management

### External Integration
- **MeshCentral Documentation**: https://meshcentral.com/
- **MeshCentral Protocol**: Binary KVM protocol specification (vendor documentation)

---

## Protocol Reference

### Command Summary Table

| Command | Hex | Size | Direction | Payload |
|---------|-----|------|-----------|---------|
| MNG_KVM_KEY | 0x0001 | 6 | C→S | action(1), vk(1) |
| MNG_KVM_MOUSE | 0x0002 | 10 | C→S | reserved(2), button(1), x(2), y(2) |
| MNG_KVM_TILE | 0x0003 | Variable | S→C | x(2), y(2), jpeg(n) |
| COMPRESSION | 0x0005 | 10 | C→S | type(1), quality(1), scale(2), timer(2) |
| REFRESH | 0x0006 | 4 | C→S | (none) |
| SCREEN_SIZE | 0x0007 | 8 | S→C | width(2), height(2) |
| PAUSE | 0x0008 | 5 | C→S | pause(1) |
| CTRLALTDEL | 0x000A | 4 | C→S | (none) |
| DISPLAY_LIST | 0x000B | Variable | Both | count(2), displays(n) |
| SWITCH_DISPLAY | 0x000C | 6 | C→S | displayId(2) |
| KVM_INIT | 0x000E | 8 | C→S | flags(4) |
| JUMBO_SHIM | 0x001B | 8 | Both | size(3), realCmd(2) |
| DISPLAY_LOCATION | 0x0052 | 16 | S→C | id(2), x(2), y(2), w(2), h(2), flags(2) |

**Legend**: C→S = Client to Server, S→C = Server to Client, (n) = byte count

---

## Best Practices

### 1. Resource Management

```typescript
// Always detach when component unmounts
useEffect(() => {
  const desktop = new MeshDesktop()
  desktop.attach(canvasRef.current)
  
  return () => {
    desktop.detach()  // Critical: prevents memory leaks
  }
}, [])
```

### 2. Error Handling

```typescript
// Wrap binary operations in try-catch
try {
  desktop.onBinaryFrame(data)
} catch (error) {
  console.error('Frame decode error:', error)
  // Optionally request refresh
  desktop.requestRefresh()
}
```

### 3. Display Management

```typescript
// Request display list after connection
desktop.onDisplayListChange((displays) => {
  if (displays.length > 1) {
    // Show display selector UI
    setAvailableDisplays(displays)
  }
})

// Always refresh after switching
desktop.switchDisplay(displayId)
// Refresh is called automatically in switchDisplay()
```

### 4. Performance Tuning

```typescript
// For high-latency connections, increase quality
// (sent during initialization via COMPRESSION command)
const highLatencySettings = {
  type: 1,        // JPEG
  quality: 30,    // Lower quality = smaller tiles
  scaling: 768,   // 75% scale
  frameTimer: 150 // Slower refresh
}

// For low-latency connections, increase quality
const lowLatencySettings = {
  type: 1,        // JPEG
  quality: 70,    // Higher quality
  scaling: 1024,  // 100% scale
  frameTimer: 50  // Faster refresh
}
```

---

## Troubleshooting

### Common Issues

#### 1. Black Screen / No Frames

**Symptoms**: Canvas remains black after connection

**Causes**:
- Desktop stream is paused
- Initialization sequence incomplete
- WebSocket not sending binary data

**Solutions**:
```typescript
// Ensure initialization sequence completes
desktop.setSender(ws.send)  // Triggers auto-init

// Manually request refresh
desktop.requestRefresh()

// Check WebSocket binary type
websocket.binaryType = 'arraybuffer'
```

#### 2. Stuck Keys

**Symptoms**: Keys remain pressed on remote machine

**Causes**:
- Window blur not handled
- Key-up events not sent

**Solutions**:
```typescript
// Module automatically handles window blur
// Ensure detach() is called on unmount

// Manual key release (if needed)
window.addEventListener('blur', () => {
  desktop.detach()
  desktop.attach(canvas)  // Re-attach to reset state
})
```

#### 3. Tile Decode Errors

**Symptoms**: Console errors about image decoding

**Causes**:
- Corrupted JPEG data
- Unsupported image format
- Browser compatibility

**Solutions**:
```typescript
// Module automatically falls back to Image element
// Check browser support for createImageBitmap

if (!window.createImageBitmap) {
  console.warn('createImageBitmap not supported, using fallback')
}

// Request refresh to recover
desktop.requestRefresh()
```

#### 4. High Memory Usage

**Symptoms**: Browser memory grows continuously

**Causes**:
- Tile queue not draining
- Bitmaps not released
- Accumulator buffer growing

**Solutions**:
```typescript
// Module has built-in limits:
// - 300 tile queue max
// - 16MB accumulator max
// - Automatic bitmap cleanup

// If issues persist, reduce frame rate
// (adjust COMPRESSION frameTimer to 200+)
```

---

## Future Enhancements

### Planned Features

1. **Clipboard Integration**
   - Bidirectional clipboard sync
   - Text and image support
   - Clipboard protocol commands

2. **Audio Streaming**
   - Remote audio playback
   - WebRTC audio channel
   - Audio quality settings

3. **Touch Input Support**
   - Multi-touch gestures
   - Touch-to-mouse mapping
   - Mobile device optimization

4. **Recording & Playback**
   - Session recording
   - Frame capture
   - Playback controls

5. **Advanced Display Features**
   - Virtual display spanning
   - Custom resolution requests
   - Display rotation support

### Protocol Extensions

```typescript
// Future command additions
const FutureCommands = {
  CLIPBOARD_TEXT: 0x0010,
  CLIPBOARD_IMAGE: 0x0011,
  AUDIO_START: 0x0020,
  AUDIO_DATA: 0x0021,
  TOUCH_EVENT: 0x0030,
  RECORDING_START: 0x0040,
  RECORDING_STOP: 0x0041
}
```

---

## Security Considerations

### Authentication

- Desktop connections require valid MeshCentral session
- Authentication handled by [gateway_service](gateway_service.md)
- JWT tokens validated before WebSocket upgrade

### Permissions

```typescript
// Required permissions for desktop access
const requiredRights = {
  mesh: MeshRights.REMOTECONTROL,  // Remote desktop access
  user: UserRights.REMOTECONTROL   // User-level permission
}

// File access requires additional rights
const fileRights = {
  mesh: MeshRights.SERVERFILES,
  site: SiteRights.FILEACCESS
}
```

### Data Protection

- All communication over WSS (WebSocket Secure)
- Binary protocol prevents injection attacks
- No sensitive data stored in browser memory
- Automatic cleanup on disconnect

---

## Testing

### Unit Test Coverage

```typescript
describe('MeshDesktop', () => {
  test('encodes mouse move correctly', () => {
    const desktop = new MeshDesktop()
    const encoded = desktop['encodeMouseMove'](100, 200)
    expect(encoded[0]).toBe(0x00)
    expect(encoded[1]).toBe(0x02)
    expect(encoded[6]).toBe(0x00)
    expect(encoded[7]).toBe(0x64)  // 100
    expect(encoded[8]).toBe(0x00)
    expect(encoded[9]).toBe(0xC8)  // 200
  })
  
  test('converts key codes correctly', () => {
    const desktop = new MeshDesktop()
    const event = { code: 'KeyA' } as KeyboardEvent
    const vk = desktop['convertKeyCode'](event)
    expect(vk).toBe(0x41)  // 'A'
  })
  
  test('detects extended keys', () => {
    const desktop = new MeshDesktop()
    const event = { code: 'ArrowLeft' } as KeyboardEvent
    expect(desktop['isExtendedKey'](event)).toBe(true)
  })
})
```

### Integration Testing

```typescript
// Test with mock WebSocket
const mockWS = {
  send: jest.fn(),
  binaryType: 'arraybuffer'
}

const desktop = new MeshDesktop()
desktop.setSender(mockWS.send)

// Verify initialization sequence
expect(mockWS.send).toHaveBeenCalledTimes(5)
// KVM_INIT, COMPRESSION, PAUSE, REFRESH, DISPLAY_LIST
```

---

## Performance Metrics

### Typical Performance

| Metric | Value | Notes |
|--------|-------|-------|
| **Frame Decode Time** | 5-15ms | Per tile, hardware-accelerated |
| **Input Latency** | 10-50ms | Network dependent |
| **Memory Usage** | 50-150MB | Includes tile buffers |
| **CPU Usage** | 5-15% | During active streaming |
| **Tile Queue Size** | 0-300 | Backpressure managed |
| **Concurrent Decodes** | 3 | Configurable |

### Optimization Tips

```typescript
// For low-end devices
const lowEndConfig = {
  maxConcurrentDecodes: 2,  // Reduce parallel decoding
  maxQueueSize: 150,        // Smaller queue
  quality: 30,              // Lower JPEG quality
  scaling: 512              // 50% scale
}

// For high-end devices
const highEndConfig = {
  maxConcurrentDecodes: 4,  // More parallel decoding
  maxQueueSize: 500,        // Larger queue
  quality: 80,              // Higher JPEG quality
  scaling: 1024             // 100% scale
}
```

---

## API Reference

### MeshDesktop Class

#### Constructor

```typescript
constructor()
```

Creates a new MeshDesktop instance. Does not establish connection.

#### Methods

##### attach(canvas: HTMLCanvasElement): void

Attaches input handlers to the canvas and begins capturing events.

**Parameters**:
- `canvas`: HTML canvas element for rendering

**Example**:
```typescript
const canvas = document.getElementById('desktop') as HTMLCanvasElement
desktop.attach(canvas)
```

##### detach(): void

Removes all event listeners and cleans up resources.

**Example**:
```typescript
desktop.detach()
```

##### setSender(sender: (data: Uint8Array) => void): void

Sets the WebSocket sender function and triggers initialization.

**Parameters**:
- `sender`: Function to send binary data to server

**Example**:
```typescript
desktop.setSender((data) => websocket.send(data))
```

##### setViewOnly(viewOnly: boolean): void

Enables or disables view-only mode (no input).

**Parameters**:
- `viewOnly`: True to disable input

##### setSwapMouseButtons(swap: boolean): void

Swaps left and right mouse buttons.

**Parameters**:
- `swap`: True to swap buttons

##### setUseRemoteKeyboardMap(useRemoteMap: boolean): void

Configures remote keyboard layout usage (future feature).

**Parameters**:
- `useRemoteMap`: True to use remote layout

##### sendCtrlAltDel(): void

Sends Ctrl+Alt+Delete to remote machine.

**Example**:
```typescript
desktop.sendCtrlAltDel()
```

##### sendKeyCombo(combo: string): void

Sends predefined key combination.

**Parameters**:
- `combo`: Key combination string (e.g., 'ctrl+c', 'win+l')

**Example**:
```typescript
desktop.sendKeyCombo('ctrl+alt+del')
desktop.sendKeyCombo('win+r')
```

##### requestRefresh(): void

Requests full screen refresh from server.

**Example**:
```typescript
desktop.requestRefresh()
```

##### requestDisplayList(): void

Requests list of available displays.

**Example**:
```typescript
desktop.requestDisplayList()
```

##### switchDisplay(displayId: number): void

Switches to specified display.

**Parameters**:
- `displayId`: Display identifier from display list

**Example**:
```typescript
desktop.switchDisplay(1)
```

##### getDisplayList(): DisplayInfo[]

Returns current display list.

**Returns**: Array of DisplayInfo objects

**Example**:
```typescript
const displays = desktop.getDisplayList()
console.log(`Found ${displays.length} displays`)
```

##### onDisplayListChange(callback: (displays: DisplayInfo[]) => void): void

Registers callback for display list changes.

**Parameters**:
- `callback`: Function called when display list updates

**Example**:
```typescript
desktop.onDisplayListChange((displays) => {
  updateDisplaySelector(displays)
})
```

##### onBinaryFrame(data: Uint8Array): Promise<void>

Processes incoming binary frame from server.

**Parameters**:
- `data`: Binary frame data

**Example**:
```typescript
websocket.onmessage = (event) => {
  if (event.data instanceof ArrayBuffer) {
    desktop.onBinaryFrame(new Uint8Array(event.data))
  }
}
```

---

## Conclusion

The **frontend_meshcentral** module provides a robust, high-performance implementation of the MeshCentral remote desktop protocol. Its tile-based rendering, concurrent decoding, and comprehensive input handling make it suitable for production remote support scenarios within the OpenFrame platform.

**Key Strengths**:
- ✅ Complete binary protocol implementation
- ✅ Multi-display support
- ✅ Performance-optimized rendering pipeline
- ✅ Comprehensive keyboard/mouse handling
- ✅ Graceful error handling and resource cleanup

**Integration Points**:
- React UI components for remote desktop interface
- WebSocket management via [gateway_service](gateway_service.md)
- Device management via [frontend_device_management](frontend_device_management.md)
- Authentication via [frontend_authentication](frontend_authentication.md)

For questions or contributions, join the OpenMSP Slack community: https://www.openmsp.ai/

---

**Related Documentation**:
- [Frontend Main Application](frontend_main.md)
- [Frontend API Clients](frontend_api_clients.md)
- [Gateway Service](gateway_service.md)
- [Client Service](client_service.md)
