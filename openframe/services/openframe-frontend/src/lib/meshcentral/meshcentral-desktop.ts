export interface DisplayInfo {
  id: number
  x: number
  y: number
  w: number
  h: number
  primary: boolean
}

export type DesktopInputHandlers = {
  attach(canvas: HTMLCanvasElement): void
  detach(): void
  setViewOnly(viewOnly: boolean): void
  sendCtrlAltDel?(): void
  sendKeyCombo?(combo: string): void
  requestRefresh?(): void
  requestDisplayList?(): void
  switchDisplay?(displayId: number): void
  getDisplayList?(): DisplayInfo[]
  onDisplayListChange?(callback: (displays: DisplayInfo[]) => void): void
  onFirstFrame?(callback: () => void): void
}

export class MeshDesktop implements DesktopInputHandlers {
  private canvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null
  private viewOnly = false
  private swapMouseButtons = false
  private useRemoteKeyboardMap = false
  private listeners: Array<() => void> = []
  private drawing = false
  private accum: Uint8Array | null = null
  private accumOffset = 0
  private readonly maxAccumBytes = 16 * 1024 * 1024
  private stopped = false
  private sender: ((data: Uint8Array) => void) | null = null
  private remoteWidth = 0
  private remoteHeight = 0
  private pressedKeys: Array<{ vk: number; extended: boolean }> = []

  private tileQueue: Array<{ x: number; y: number; bytes: Uint8Array }> = []
  private activeDecodes = 0
  private readonly maxConcurrentDecodes = 3
  private drawQueue: Array<{ x: number; y: number; bitmap: ImageBitmap | HTMLImageElement; url?: string }> = []
  private drawScheduled = false
  
  private displayList: DisplayInfo[] = []
  private currentDisplay = 0
  private onDisplayListCallback: ((displays: DisplayInfo[]) => void) | null = null
  private firstFrameDrawn = false
  private onFirstFrameCallback: (() => void) | null = null

  attach(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.stopped = false
    // Input listeners (scaffold): implement binary encoders per MeshCentral desktop protocol later
    const onMouseMove = (e: MouseEvent) => {
      if (this.viewOnly) return
      const { x, y } = this.getRemoteXY(e)
      this.send(this.encodeMouseMove(x, y))
    }
    const onMouseDown = (e: MouseEvent) => {
      if (this.viewOnly) return
      if (!this.canvas) return
      this.canvas.focus?.()
      const { x, y } = this.getRemoteXY(e)
      const buttonDown = this.mapMouseButton(e.button)
      if (buttonDown == null) return
      this.send(this.encodeMouseButton(buttonDown, x, y))
      e.preventDefault()
    }
    const onMouseUp = (e: MouseEvent) => {
      if (this.viewOnly) return
      const { x, y } = this.getRemoteXY(e)
      const buttonDown = this.mapMouseButton(e.button)
      if (buttonDown == null) return
      const buttonUp = (buttonDown * 2) & 0xff
      this.send(this.encodeMouseButton(buttonUp, x, y))
      e.preventDefault()
    }
    const onDblClick = (e: MouseEvent) => {
      if (this.viewOnly) return
      const { x, y } = this.getRemoteXY(e)
      this.send(this.encodeMouseDoubleClick(x, y))
      e.preventDefault()
    }
    const onWheel = (e: WheelEvent) => {
      if (this.viewOnly) return
      const { x, y } = this.getRemoteXY(e as any as MouseEvent)
      const sign = e.deltaY === 0 ? 0 : (e.deltaY > 0 ? 1 : -1)
      let delta = sign * 120 // standard wheel notches
      if (e.deltaMode === 0) {
        // pixel mode - scale roughly to notches
        delta = Math.max(-32768, Math.min(32767, Math.round(e.deltaY)))
      }
      this.send(this.encodeMouseWheel(x, y, delta))
      e.preventDefault()
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (this.viewOnly) return
      
      const keyCode = this.convertKeyCode(e) ?? this.mapKeyToVirtualKey(e) ?? (e as any).keyCode
      if (keyCode == null) return
      
      const isExt = this.isExtendedKey(e)
      
      if (!e.repeat && !this.pressedKeys.some(k => k.vk === keyCode)) {
        this.pressedKeys.unshift({ vk: keyCode, extended: isExt })
      }
      
      this.send(this.encodeKeyEvent(1, keyCode, isExt))
      
      if (this.shouldPreventDefault(e)) {
        e.preventDefault()
      }
    }
    const onKeyPress = (_e: KeyboardEvent) => { /* not used; rely on MNG_KVM_KEY only */ }
    const onKeyUp = (e: KeyboardEvent) => {
      if (this.viewOnly) return
      const keyCode = this.convertKeyCode(e) ?? this.mapKeyToVirtualKey(e) ?? (e as any).keyCode
      if (keyCode == null) return
      
      const isExt = this.isExtendedKey(e)

      const idx = this.pressedKeys.findIndex(k => k.vk === keyCode)
      if (idx !== -1) {
        const storedKey = this.pressedKeys[idx]
        this.pressedKeys.splice(idx, 1)
        this.send(this.encodeKeyEvent(2, keyCode, storedKey.extended))
      } else {
        this.send(this.encodeKeyEvent(2, keyCode, isExt))
      }
      
      e.preventDefault()
    }
    const onWindowBlur = () => {
      const keys = [...this.pressedKeys]
      this.pressedKeys = []
      for (const k of keys) this.send(this.encodeKeyEvent(2, k.vk, k.extended))
    }

    canvas.addEventListener('mousemove', onMouseMove)
    canvas.addEventListener('mousedown', onMouseDown)
    canvas.addEventListener('mouseup', onMouseUp)
    canvas.addEventListener('wheel', onWheel)
    canvas.addEventListener('dblclick', onDblClick)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keypress', onKeyPress)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onWindowBlur)

    this.listeners.push(() => canvas.removeEventListener('mousemove', onMouseMove))
    this.listeners.push(() => canvas.removeEventListener('mousedown', onMouseDown))
    this.listeners.push(() => canvas.removeEventListener('mouseup', onMouseUp))
    this.listeners.push(() => canvas.removeEventListener('wheel', onWheel))
    this.listeners.push(() => canvas.removeEventListener('dblclick', onDblClick))
    this.listeners.push(() => window.removeEventListener('keydown', onKeyDown))
    this.listeners.push(() => window.removeEventListener('keypress', onKeyPress))
    this.listeners.push(() => window.removeEventListener('keyup', onKeyUp))
    this.listeners.push(() => window.removeEventListener('blur', onWindowBlur))
  }

  detach() {
    this.stopped = true
    this.tileQueue = []
    this.drawQueue = []
    this.activeDecodes = 0
    this.accum = null
    this.accumOffset = 0
    this.firstFrameDrawn = false
    for (const off of this.listeners) off()
    this.listeners = []
    this.canvas = null
    this.ctx = null
  }

  setViewOnly(viewOnly: boolean) { this.viewOnly = viewOnly }

  setSwapMouseButtons(swap: boolean) {
    this.swapMouseButtons = swap
  }

  setUseRemoteKeyboardMap(useRemoteMap: boolean) {
    this.useRemoteKeyboardMap = useRemoteMap
  }

  setSender(sender: (data: Uint8Array) => void) {
    this.sender = sender
    this.initializeDesktop()
  }

  private initializeDesktop() {
    // Command 1: Desktop Initialization (KVM_INIT)
    const initBuffer = new Uint8Array(8)
    const initView = new DataView(initBuffer.buffer)
    initView.setUint16(0, 0x000E, false)  // Command: KVM_INIT
    initView.setUint16(2, 0x0008, false)  // Size: 8 bytes total
    initView.setUint32(4, 0, false)       // Flags: 0 for normal mode
    this.send(initBuffer)
    
    // Command 2: Set Compression Settings (Required for image quality)
    const compBuffer = new Uint8Array(10)
    const compView = new DataView(compBuffer.buffer)
    compView.setUint16(0, 0x0005, false)  // Command: COMPRESSION
    compView.setUint16(2, 0x000A, false)  // Size: 10 bytes total
    compView.setUint8(4, 1)               // Type: 1=JPEG, 2=PNG, 3=TIFF, 4=WebP
    compView.setUint8(5, 50)              // Quality: 1-100 (50 recommended)
    compView.setUint16(6, 1024, false)    // Scaling: 1024=100%, 512=50%
    compView.setUint16(8, 100, false)     // Frame timer: ms between frames
    this.send(compBuffer)
    
    // Command 3: Unpause Desktop Stream (CRITICAL)
    const unpauseBuffer = new Uint8Array(5)
    const unpauseView = new DataView(unpauseBuffer.buffer)
    unpauseView.setUint16(0, 0x0008, false)  // Command: PAUSE
    unpauseView.setUint16(2, 0x0005, false)  // Size: 5 bytes total
    unpauseView.setUint8(4, 0)               // 0=unpause, 1=pause
    this.send(unpauseBuffer)
    
    // Command 4: Request Initial Screen Refresh (Optional but helpful)
    const refreshBuffer = new Uint8Array(4)
    const refreshView = new DataView(refreshBuffer.buffer)
    refreshView.setUint16(0, 0x0006, false)  // Command: REFRESH
    refreshView.setUint16(2, 0x0004, false)  // Size: 4 bytes total
    this.send(refreshBuffer)
    
    // Command 5: Request Display List for Multiscreen Support
    this.requestDisplayList()
  }

  private send(bytes: Uint8Array) {
    if (!this.sender) return
    try { this.sender(bytes) } catch {}
  }

  private getRemoteXY(e: MouseEvent): { x: number; y: number } {
    if (!this.canvas || this.remoteWidth === 0 || this.remoteHeight === 0) {
      return { x: 0, y: 0 }
    }
    const rect = this.canvas.getBoundingClientRect()
    const cx = (e.clientX - rect.left) / Math.max(1, rect.width)
    const cy = (e.clientY - rect.top) / Math.max(1, rect.height)
    let x = Math.round(cx * this.remoteWidth)
    let y = Math.round(cy * this.remoteHeight)
    if (x < 0) x = 0
    if (y < 0) y = 0
    if (x > 65535) x = 65535
    if (y > 65535) y = 65535
    return { x, y }
  }

  private mapMouseButton(btn: number): number | null {
    // 0: left, 1: middle, 2: right
    if (this.swapMouseButtons) {
      if (btn === 0) return 0x08
      if (btn === 2) return 0x02
      if (btn === 1) return 0x20
    } else {
      if (btn === 0) return 0x02
      if (btn === 2) return 0x08
      if (btn === 1) return 0x20
    }
    return null
  }

  private encodeMouseButton(buttonByte: number, x: number, y: number): Uint8Array {
    const buf = new Uint8Array(10)
    buf[0] = 0x00 // type prefix
    buf[1] = 0x02 // InputType.MOUSE
    buf[2] = 0x00
    buf[3] = 0x0a // length = 10
    buf[4] = 0x00
    buf[5] = buttonByte & 0xff
    buf[6] = (x >> 8) & 0xff
    buf[7] = x & 0xff
    buf[8] = (y >> 8) & 0xff
    buf[9] = y & 0xff
    return buf
  }

  private encodeMouseMove(x: number, y: number): Uint8Array {
    const buf = new Uint8Array(10)
    buf[0] = 0x00
    buf[1] = 0x02
    buf[2] = 0x00
    buf[3] = 0x0a
    buf[4] = 0x00
    buf[5] = 0x00 // no buttons pressed
    buf[6] = (x >> 8) & 0xff
    buf[7] = x & 0xff
    buf[8] = (y >> 8) & 0xff
    buf[9] = y & 0xff
    return buf
  }

  private encodeMouseDoubleClick(x: number, y: number): Uint8Array {
    const buf = new Uint8Array(10)
    buf[0] = 0x00
    buf[1] = 0x02
    buf[2] = 0x00
    buf[3] = 0x0a
    buf[4] = 0x00
    buf[5] = 0x88
    buf[6] = (x >> 8) & 0xff
    buf[7] = x & 0xff
    buf[8] = (y >> 8) & 0xff
    buf[9] = y & 0xff
    return buf
  }

  private encodeMouseWheel(x: number, y: number, delta: number): Uint8Array {
    const buf = new Uint8Array(12)
    buf[0] = 0x00
    buf[1] = 0x02
    buf[2] = 0x00
    buf[3] = 0x0c // 12
    buf[4] = 0x00
    buf[5] = 0x00
    buf[6] = (x >> 8) & 0xff
    buf[7] = x & 0xff
    buf[8] = (y >> 8) & 0xff
    buf[9] = y & 0xff
    const d = Math.max(-32768, Math.min(32767, delta | 0))
    const dhi = (d >> 8) & 0xff
    const dlo = d & 0xff
    buf[10] = dhi
    buf[11] = dlo
    return buf
  }

  private encodeKeyEvent(action: number, vk: number, extended: boolean): Uint8Array {
    let protocolAction = action - 1
    
    if (extended) {
      if (protocolAction === 0) protocolAction = 4
      if (protocolAction === 1) protocolAction = 3
    }
    
    const buf = new Uint8Array(6)
    buf[0] = 0x00
    buf[1] = 0x01  // Command: MNG_KVM_KEY
    buf[2] = 0x00
    buf[3] = 0x06  // Total message size: 6 bytes
    buf[4] = protocolAction & 0xff  // Protocol action (0=DOWN, 1=UP, 3=EXUP, 4=EXDOWN)
    buf[5] = vk & 0xff              // Virtual key code
    
    return buf
  }


  private mapKeyToVirtualKey(e: KeyboardEvent): number | null {
    const key = e.key
    
    const map: Record<string, number> = {
      // Modifier key names
      'Shift': 0x10,
      'Control': 0x11,
      'Alt': 0x12,
      'Meta': 0x5B,
      
      // Special character keys by name
      ' ': 0x20,
      'Backspace': 0x08,
      'Tab': 0x09,
      'Enter': 0x0D,
      'Escape': 0x1B,
      'Esc': 0x1B,
      'Delete': 0x2E,
      'Insert': 0x2D,
      
      // Navigation by name
      'Home': 0x24,
      'End': 0x23,
      'PageUp': 0x21,
      'PageDown': 0x22,
      'ArrowLeft': 0x25,
      'ArrowUp': 0x26,
      'ArrowRight': 0x27,
      'ArrowDown': 0x28,
      
      // Lock keys
      'CapsLock': 0x14,
      'NumLock': 0x90,
      'ScrollLock': 0x91,
    }
    
    return map[key] || null
  }

  private extendedKeyTable: string[] = [
    'ShiftRight', 'AltRight', 'ControlRight',
    'Home', 'End', 'Insert', 'Delete',
    'PageUp', 'PageDown', 'NumpadDivide',
    'NumpadEnter', 'NumLock', 'Pause'
  ]

  private convertKeyCode(e: KeyboardEvent): number | undefined {
    if (e.code && e.code.startsWith('Key') && e.code.length === 4) return e.code.charCodeAt(3)
    if (e.code && e.code.startsWith('Digit') && e.code.length === 6) return e.code.charCodeAt(5)
    if (e.code && /^F([1-9]|1[0-2])$/.test(e.code)) {
      const n = parseInt(e.code.substring(1), 10)
      return 111 + n // F1=112 (0x70) to F12=123 (0x7B)
    }
    if (e.code && e.code.startsWith('Numpad') && e.code.length === 7 && /[0-9]/.test(e.code.charAt(6))) {
      return parseInt(e.code.charAt(6)) + 96 // Numpad 0-9 are 96-105
    }
    
    const t: Record<string, number> = {
      // Modifier keys
      ShiftLeft: 0x10, ShiftRight: 0x10,
      ControlLeft: 0x11, ControlRight: 0x11,
      AltLeft: 0x12, AltRight: 0x12,
      MetaLeft: 0x5B, MetaRight: 0x5C,
      
      // Special keys
      Pause: 0x13, CapsLock: 0x14, Space: 0x20,
      Quote: 0xDE, Minus: 0xBD, Comma: 0xBC,
      Period: 0xBE, Slash: 0xBF, Semicolon: 0xBA,
      Equal: 0xBB, BracketLeft: 0xDB, Backslash: 0xDC,
      BracketRight: 0xDD, Backquote: 0xC0,
      
      // Numpad operations
      NumpadMultiply: 0x6A, NumpadAdd: 0x6B,
      NumpadSubtract: 0x6D, NumpadDecimal: 0x6E,
      NumpadDivide: 0x6F, NumLock: 0x90,
      
      // System keys
      ScrollLock: 0x91, PrintScreen: 0x2C,
      Backspace: 0x08, Tab: 0x09, Enter: 0x0D,
      NumpadEnter: 0x0D, Escape: 0x1B,
      ContextMenu: 0x5D,
      
      // Navigation keys
      Delete: 0x2E, Home: 0x24, End: 0x23,
      PageUp: 0x21, PageDown: 0x22,
      ArrowLeft: 0x25, ArrowUp: 0x26,
      ArrowRight: 0x27, ArrowDown: 0x28,
      Insert: 0x2D
    }
    return (e.code && t[e.code]) || undefined
  }

  private isExtendedKey(e: KeyboardEvent): boolean {
    if (!e.code) return false
    if (e.code.startsWith('Arrow')) return true
    if (e.code === 'MetaLeft' || e.code === 'MetaRight') return true
    if (e.code === 'ShiftRight' || e.code === 'AltRight' || e.code === 'ControlRight') return true
    
    return this.extendedKeyTable.includes(e.code)
  }

  private shouldPreventDefault(e: KeyboardEvent): boolean {
    const prevent = [
      'F1','F2','F3','F4','F5','F6','F7','F8','F9','F10','F11','F12',
      'Tab','Enter','Escape','Backspace','Delete','Home','End','PageUp','PageDown'
    ]
    // Do not prevent default for pure modifier keys
    if (e.key === 'Control' || e.key === 'Shift' || e.key === 'Alt' || e.key === 'Meta') return false
    if (prevent.includes(e.key)) return true
    if (e.code && e.code.startsWith('Arrow')) return true
    if (e.ctrlKey || e.altKey || e.metaKey) return true
    return false
  }

  sendCtrlAltDel() {
    // Ctrl+Alt+Del Message (Command 0x0A)
    // Byte 0-1: Command (0x00, 0x0A)
    // Byte 2-3: Data Size (0x00, 0x04) - Always 4 bytes
    const buf = new Uint8Array(4)
    buf[0] = 0x00
    buf[1] = 0x0A  // Command: MNG_CTRLALTDEL
    buf[2] = 0x00
    buf[3] = 0x04  // Data Size: Always 4 bytes
    this.send(buf)
  }

  requestRefresh() {
    const refreshBuffer = new Uint8Array(4)
    const refreshView = new DataView(refreshBuffer.buffer)
    refreshView.setUint16(0, 0x0006, false)  // Command: REFRESH
    refreshView.setUint16(2, 0x0004, false)  // Size: 4 bytes total
    this.send(refreshBuffer)
  }
  
  requestDisplayList() {
    // Command 11 (0x000B): Request Display List
    const displayListBuffer = new Uint8Array(4)
    const displayListView = new DataView(displayListBuffer.buffer)
    displayListView.setUint16(0, 0x000B, false)  // Command: DISPLAY_LIST
    displayListView.setUint16(2, 0x0004, false)  // Size: 4 bytes total
    this.send(displayListBuffer)
  }
  
  switchDisplay(displayId: number) {
    // Pause the current stream
    const pauseBuffer = new Uint8Array(5)
    const pauseView = new DataView(pauseBuffer.buffer)
    pauseView.setUint16(0, 0x0008, false)  // Command: PAUSE
    pauseView.setUint16(2, 0x0005, false)  // Size: 5 bytes
    pauseView.setUint8(4, 1)               // 1=pause
    this.send(pauseBuffer)
    
    // Switch display
    const switchBuffer = new Uint8Array(6)
    const switchView = new DataView(switchBuffer.buffer)
    switchView.setUint16(0, 0x000C, false)  // Command: SWITCH_DISPLAY
    switchView.setUint16(2, 0x0006, false)  // Size: 6 bytes
    switchView.setUint16(4, displayId, false)  // Display ID
    this.send(switchBuffer)
    this.currentDisplay = displayId
    
    // Unpause the stream
    const unpauseBuffer = new Uint8Array(5)
    const unpauseView = new DataView(unpauseBuffer.buffer)
    unpauseView.setUint16(0, 0x0008, false)  // Command: PAUSE
    unpauseView.setUint16(2, 0x0005, false)  // Size: 5 bytes
    unpauseView.setUint8(4, 0)               // 0=unpause
    this.send(unpauseBuffer)
    
    // Refresh after switching
    this.requestRefresh()
  }
  
  getDisplayList(): DisplayInfo[] {
    return this.displayList
  }
  
  onDisplayListChange(callback: (displays: DisplayInfo[]) => void) {
    this.onDisplayListCallback = callback
  }

  onFirstFrame(callback: () => void) {
    this.onFirstFrameCallback = callback
  }
  
  sendKeyCombo(combo: string) {
    const sequences: Record<string, Array<{ action: number; keyCode: number; extended: boolean }>> = {
      'ctrl+c': [
        { action: 1, keyCode: 0x11, extended: false },
        { action: 1, keyCode: 0x43, extended: false },
        { action: 2, keyCode: 0x43, extended: false },
        { action: 2, keyCode: 0x11, extended: false },
      ],
      'ctrl+v': [
        { action: 1, keyCode: 0x11, extended: false },
        { action: 1, keyCode: 0x56, extended: false },
        { action: 2, keyCode: 0x56, extended: false },
        { action: 2, keyCode: 0x11, extended: false },
      ],
      'ctrl+a': [
        { action: 1, keyCode: 0x11, extended: false },
        { action: 1, keyCode: 0x41, extended: false },
        { action: 2, keyCode: 0x41, extended: false },
        { action: 2, keyCode: 0x11, extended: false },
      ],
      'ctrl+x': [
        { action: 1, keyCode: 0x11, extended: false },
        { action: 1, keyCode: 0x58, extended: false },
        { action: 2, keyCode: 0x58, extended: false },
        { action: 2, keyCode: 0x11, extended: false },
      ],
      'ctrl+z': [
        { action: 1, keyCode: 0x11, extended: false },
        { action: 1, keyCode: 0x5A, extended: false },
        { action: 2, keyCode: 0x5A, extended: false },
        { action: 2, keyCode: 0x11, extended: false },
      ],
      'ctrl+w': [
        { action: 1, keyCode: 0x11, extended: false },
        { action: 1, keyCode: 0x57, extended: false },
        { action: 2, keyCode: 0x57, extended: false },
        { action: 2, keyCode: 0x11, extended: false },
      ],
      'alt+f4': [
        { action: 1, keyCode: 0x12, extended: false },
        { action: 1, keyCode: 0x73, extended: false },
        { action: 2, keyCode: 0x73, extended: false },
        { action: 2, keyCode: 0x12, extended: false },
      ],
      'alt+tab': [
        { action: 1, keyCode: 0x12, extended: false },
        { action: 1, keyCode: 0x09, extended: false },
        { action: 2, keyCode: 0x09, extended: false },
        { action: 2, keyCode: 0x12, extended: false },
      ],
      'win+l': [
        { action: 1, keyCode: 0x5B, extended: true },
        { action: 1, keyCode: 0x4C, extended: false },
        { action: 2, keyCode: 0x4C, extended: false },
        { action: 2, keyCode: 0x5B, extended: true },
      ],
      'win+m': [
        { action: 1, keyCode: 0x5B, extended: true },
        { action: 1, keyCode: 0x4D, extended: false },
        { action: 2, keyCode: 0x4D, extended: false },
        { action: 2, keyCode: 0x5B, extended: true },
      ],
      'win+r': [
        { action: 1, keyCode: 0x5B, extended: true },
        { action: 1, keyCode: 0x52, extended: false },
        { action: 2, keyCode: 0x52, extended: false },
        { action: 2, keyCode: 0x5B, extended: true },
      ],
      'win+up': [
        { action: 1, keyCode: 0x5B, extended: true },
        { action: 1, keyCode: 0x26, extended: false },
        { action: 2, keyCode: 0x26, extended: false },
        { action: 2, keyCode: 0x5B, extended: true },
      ],
      'win+down': [
        { action: 1, keyCode: 0x5B, extended: true },
        { action: 1, keyCode: 0x28, extended: false },
        { action: 2, keyCode: 0x28, extended: false },
        { action: 2, keyCode: 0x5B, extended: true },
      ],
      'shift+win+m': [
        { action: 1, keyCode: 0x10, extended: false },
        { action: 1, keyCode: 0x5B, extended: true },
        { action: 1, keyCode: 0x4D, extended: false },
        { action: 2, keyCode: 0x4D, extended: false },
        { action: 2, keyCode: 0x5B, extended: true },
        { action: 2, keyCode: 0x10, extended: false },
      ],
      'ctrl+shift+esc': [
        { action: 1, keyCode: 0x11, extended: false },
        { action: 1, keyCode: 0x10, extended: false },
        { action: 1, keyCode: 0x1B, extended: false },
        { action: 2, keyCode: 0x1B, extended: false },
        { action: 2, keyCode: 0x10, extended: false },
        { action: 2, keyCode: 0x11, extended: false },
      ],
    }
    
    const sequence = sequences[combo.toLowerCase()]
    if (sequence) {
      for (const key of sequence) {
        this.send(this.encodeKeyEvent(key.action, key.keyCode, key.extended))
      }
    } else if (combo.toLowerCase() === 'ctrl+alt+del') {
      this.sendCtrlAltDel()
    }
  }
  
  drawPlaceholderFrame() {
    if (!this.ctx || !this.canvas) return
    const { ctx, canvas } = this
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#0f0'
    ctx.font = '16px monospace'
    ctx.fillText('Receiving desktop frames... (decoder integration pending)', 10, 24)
  }

  // Minimal decoder (big-endian):
  // Standard frame header (4 bytes): cmd:uint16 BE at [0..1], size:uint16 BE at [2..3]; payload starts at [4]
  // Jumbo shim: if cmd==27 and size==8, then jumbo:
  //  - jumbo size at [5..7] (24-bit), cmd at [8..9]; effective frame starts at [8], and its length == jumbo size
  // Commands (protocol 2):
  //  - cmd=7 Screen size: width at [4..5] BE, height at [6..7] BE
  //  - cmd=3 Tile: x at [4..5] BE, y at [6..7] BE, JPEG at [8..size)
  async onBinaryFrame(data: Uint8Array) {
    if (!this.canvas) return
    try {
      if (!this.accum || this.accum.length === 0 || this.accumOffset >= this.accum.length) {
        this.accum = data.slice(0)
        this.accumOffset = 0
      } else {
        const remaining = this.accum.length - this.accumOffset
        const merged = new Uint8Array(remaining + data.length)
        merged.set(this.accum.subarray(this.accumOffset), 0)
        merged.set(data, remaining)
        this.accum = merged
        this.accumOffset = 0
      }

      if (this.accum.length > this.maxAccumBytes) {
        // Drop oldest data by resetting buffer (safest fallback)
        this.accum = new Uint8Array(0)
        this.accumOffset = 0
        return
      }

      const buffer = this.accum
      let offset = this.accumOffset
      while (buffer && offset + 4 <= buffer.length) {
        let view = buffer.subarray(offset) as Uint8Array
        let cmd = (view[0] << 8) | view[1]
        let totalSize = (view[2] << 8) | view[3]
        let headerSkip = 0
        if (cmd === 27 && totalSize === 8) {
          // Jumbo: need at least 10 bytes
          if (view.length < 10) break
          const jumboSize = (view[5] << 16) | (view[6] << 8) | view[7]
          const jumboCmd = (view[8] << 8) | view[9]
          cmd = jumboCmd
          totalSize = jumboSize
          headerSkip = 8 // effective frame starts at byte 8
          if (view.length < headerSkip + totalSize) break
        } else {
          // Normal: ensure full frame present
          if (view.length < totalSize) break
        }

        const frame = view.subarray(headerSkip, headerSkip + totalSize)
        // Now frame has a standard header at [0..3]
        const fx = (frame[4] << 8) | frame[5]
        const fy = (frame[6] << 8) | frame[7]
        if (cmd === 7) {
          if (frame.length >= 8) {
            if (fx > 0 && fy > 0) {
              this.canvas.width = fx
              this.canvas.height = fy
              this.remoteWidth = fx
              this.remoteHeight = fy
            }
          }
        } else if (cmd === 3) {
          if (frame.length >= 8) {
            const jpegBytes = frame.subarray(8) // until end of frame
            // Enqueue tile for decode; apply backpressure by capping queue
            if (this.tileQueue.length < 300) {
              const bytesCopy = new Uint8Array(jpegBytes.length)
              bytesCopy.set(jpegBytes)
              this.tileQueue.push({ x: fx, y: fy, bytes: bytesCopy })
            } else {
              // Drop oldest to keep moving
              this.tileQueue.shift()
              const bytesCopy = new Uint8Array(jpegBytes.length)
              bytesCopy.set(jpegBytes)
              this.tileQueue.push({ x: fx, y: fy, bytes: bytesCopy })
            }
          }
        } else if (cmd === 11) {
          // Command 11: Display List Response
          this.parseDisplayList(frame)
        } else if (cmd === 82) {
          // Command 82: Display Location Info
          this.parseDisplayLocationInfo(frame)
        }

        offset += headerSkip + totalSize
      }

      this.accumOffset = offset

      this.kickDecoders()
    } catch {
      // ignore
    }
  }

  private kickDecoders() {
    if (this.stopped) return
    while (this.activeDecodes < this.maxConcurrentDecodes && this.tileQueue.length > 0) {
      const task = this.tileQueue.shift()!
      this.activeDecodes++
      this.decodeTile(task).finally(() => {
        this.activeDecodes--
        this.kickDecoders()
      })
    }
  }

  private async decodeTile(task: { x: number; y: number; bytes: Uint8Array }) {
    if (this.stopped) return
    try {
      const blob = new Blob([task.bytes.buffer as ArrayBuffer], { type: 'image/jpeg' })
      let bitmap: ImageBitmap | HTMLImageElement | null = null
      try {
        bitmap = await createImageBitmap(blob)
        if (this.stopped || !bitmap) return
        this.drawQueue.push({ x: task.x, y: task.y, bitmap })
        this.scheduleDraw()
      } catch {
        const url = URL.createObjectURL(blob)
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const i = new Image()
          i.onload = () => resolve(i)
          i.onerror = (e) => reject(e)
          i.src = url
        })
        if (this.stopped) { URL.revokeObjectURL(url); return }
        this.drawQueue.push({ x: task.x, y: task.y, bitmap: img, url })
        this.scheduleDraw()
      }
    } catch {
      // ignore
    }
  }

  private scheduleDraw() {
    if (this.drawScheduled) return
    this.drawScheduled = true
    requestAnimationFrame(() => {
      this.drawScheduled = false
      if (this.stopped || !this.ctx) {
        for (const it of this.drawQueue) { if (it.url) URL.revokeObjectURL(it.url) }
        this.drawQueue = []
        return
      }
      while (this.drawQueue.length > 0) {
        const it = this.drawQueue.shift()!
        try {
          this.ctx!.drawImage(it.bitmap as any, it.x, it.y)
          if (!this.firstFrameDrawn) {
            this.firstFrameDrawn = true
            this.onFirstFrameCallback?.()
          }
        } catch {}
        if ('close' in it.bitmap && typeof (it.bitmap as any).close === 'function') {
          try { (it.bitmap as any).close() } catch {}
        }
        if (it.url) { try { URL.revokeObjectURL(it.url) } catch {} }
      }
    })
  }
  
  private parseDisplayList(frame: Uint8Array) {
    // Display List Response Format (from Command 11):
    // Bytes 0-3: Standard header (cmd=11, size)
    // Bytes 4-5: Number of displays (uint16, big-endian)
    // Then variable format based on data size
    if (frame.length < 6) return
    
    const displayCount = (frame[4] << 8) | frame[5]
    const displays: DisplayInfo[] = []
    
    const dataBytes = frame.length - 6
    const bytesPerDisplay = displayCount > 0 ? Math.floor(dataBytes / displayCount) : 0
    
    if (bytesPerDisplay === 2 || bytesPerDisplay === 4) {
      // Simple format: just display IDs (2 bytes) or IDs + current display marker (4 bytes)
      for (let i = 0; i < displayCount; i++) {
        const offset = 6 + i * bytesPerDisplay
        if (offset + 2 > frame.length) break
        
        const id = (frame[offset] << 8) | frame[offset + 1]
        
        // 0xFFFF (65535) represents "all displays" view
        if (id === 0xFFFF) {
          // Add "all displays" as display ID 0
          const display = {
            id: 0,
            x: 0,
            y: 0,
            w: 0,
            h: 0,
            primary: false
          }
          displays.push(display)
          continue
        }
        
        // For 4-byte format, bytes 2-3 might indicate current/primary display
        let isPrimary = i === 0 // Default: first display is primary
        if (bytesPerDisplay === 4 && offset + 4 <= frame.length) {
          const flags = (frame[offset + 2] << 8) | frame[offset + 3]
          isPrimary = flags === 0xFFFF || flags === 1
        }
        
        const display = {
          id,
          x: 0,
          y: 0,
          w: 0,
          h: 0,
          primary: isPrimary
        }
        
        displays.push(display)
      }
    } else if (bytesPerDisplay >= 8) {
      // Full format with position data (8+ bytes per display)
      for (let i = 0; i < displayCount; i++) {
        const offset = 6 + i * bytesPerDisplay
        if (offset + 8 > frame.length) break
        
        const id = (frame[offset] << 8) | frame[offset + 1]
        const x = (frame[offset + 2] << 8) | frame[offset + 3]
        const y = (frame[offset + 4] << 8) | frame[offset + 5]
        
        let w = 0, h = 0, flags = 0
        if (bytesPerDisplay >= 12) {
          w = (frame[offset + 6] << 8) | frame[offset + 7]
          h = (frame[offset + 8] << 8) | frame[offset + 9]
          flags = (frame[offset + 10] << 8) | frame[offset + 11]
        } else {
          flags = (frame[offset + 6] << 8) | frame[offset + 7]
        }
        
        const display = {
          id,
          x,
          y,
          w,
          h,
          primary: (flags & 1) === 1
        }
        
        displays.push(display)
      }
    }
    
    this.displayList = displays
    if (this.onDisplayListCallback) {
      this.onDisplayListCallback(displays)
    }
  }
  
  private parseDisplayLocationInfo(frame: Uint8Array) {
    // Display Location Info Format (from Command 82):
    // Bytes 0-3: Standard header (cmd=82, size)
    // Bytes 4-5: Display ID (uint16, big-endian)
    // Bytes 6-7: X position (uint16, big-endian)
    // Bytes 8-9: Y position (uint16, big-endian)
    // Bytes 10-11: Width (uint16, big-endian)
    // Bytes 12-13: Height (uint16, big-endian)
    // Bytes 14-15: Flags (uint16, big-endian) - bit 0 = primary display
    if (frame.length < 16) return
    
    const displayId = (frame[4] << 8) | frame[5]
    const x = (frame[6] << 8) | frame[7]
    const y = (frame[8] << 8) | frame[9]
    const width = (frame[10] << 8) | frame[11]
    const height = (frame[12] << 8) | frame[13]
    const flags = (frame[14] << 8) | frame[15]
    
    const existingIndex = this.displayList.findIndex(d => d.id === displayId)
    const displayInfo: DisplayInfo = {
      id: displayId,
      x,
      y,
      w: width,
      h: height,
      primary: (flags & 1) === 1
    }
    
    if (existingIndex >= 0) {
      this.displayList[existingIndex] = displayInfo
    } else {
      this.displayList.push(displayInfo)
    }
    
    if (this.onDisplayListCallback) {
      this.onDisplayListCallback([...this.displayList])
    }
  }
}
