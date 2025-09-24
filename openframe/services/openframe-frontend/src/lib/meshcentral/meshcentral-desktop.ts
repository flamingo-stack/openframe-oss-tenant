export type DesktopInputHandlers = {
  attach(canvas: HTMLCanvasElement): void
  detach(): void
  setViewOnly(viewOnly: boolean): void
}

export class MeshDesktop implements DesktopInputHandlers {
  private canvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null
  private viewOnly = false
  private listeners: Array<() => void> = []
  private drawing = false
  private accum: Uint8Array | null = null
  private accumOffset = 0
  private readonly maxAccumBytes = 16 * 1024 * 1024
  private stopped = false
  private sender: ((data: Uint8Array) => void) | null = null
  private remoteWidth = 0
  private remoteHeight = 0

  private tileQueue: Array<{ x: number; y: number; bytes: Uint8Array }> = []
  private activeDecodes = 0
  private readonly maxConcurrentDecodes = 3
  private drawQueue: Array<{ x: number; y: number; bitmap: ImageBitmap | HTMLImageElement; url?: string }> = []
  private drawScheduled = false

  attach(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.stopped = false
    // Input listeners (scaffold): implement binary encoders per MeshCentral desktop protocol later
    const onMouseMove = (e: MouseEvent) => {
      if (!this.viewOnly) {
        // MeshCentral move packet format
      }
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
      const vk = this.mapKeyToVirtualKey(e)
      if (vk != null) {
        this.send(this.encodeKeyVirtual(vk, false))
        e.preventDefault()
      }
    }
    const onKeyPress = (e: KeyboardEvent) => {
      if (this.viewOnly) return
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const ch = e.key
      if (ch && ch.length === 1) {
        const code = ch.codePointAt(0) || 0
        this.send(this.encodeKeyUnicode(code, false))
        e.preventDefault()
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (this.viewOnly) return
      const vk = this.mapKeyToVirtualKey(e)
      if (vk != null) {
        this.send(this.encodeKeyVirtual(vk, true))
        e.preventDefault()
        return
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const ch = e.key
      if (ch && ch.length === 1) {
        const code = ch.codePointAt(0) || 0
        this.send(this.encodeKeyUnicode(code, true))
        e.preventDefault()
      }
    }

    canvas.addEventListener('mousemove', onMouseMove)
    canvas.addEventListener('mousedown', onMouseDown)
    canvas.addEventListener('mouseup', onMouseUp)
    canvas.addEventListener('wheel', onWheel)
    canvas.addEventListener('dblclick', onDblClick)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keypress', onKeyPress)
    window.addEventListener('keyup', onKeyUp)

    this.listeners.push(() => canvas.removeEventListener('mousemove', onMouseMove))
    this.listeners.push(() => canvas.removeEventListener('mousedown', onMouseDown))
    this.listeners.push(() => canvas.removeEventListener('mouseup', onMouseUp))
    this.listeners.push(() => canvas.removeEventListener('wheel', onWheel))
    this.listeners.push(() => canvas.removeEventListener('dblclick', onDblClick))
    this.listeners.push(() => window.removeEventListener('keydown', onKeyDown))
    this.listeners.push(() => window.removeEventListener('keypress', onKeyPress))
    this.listeners.push(() => window.removeEventListener('keyup', onKeyUp))
  }

  detach() {
    this.stopped = true
    this.tileQueue = []
    this.drawQueue = []
    this.activeDecodes = 0
    this.accum = null
    this.accumOffset = 0
    for (const off of this.listeners) off()
    this.listeners = []
    this.canvas = null
    this.ctx = null
  }

  setViewOnly(viewOnly: boolean) { this.viewOnly = viewOnly }

  setSender(sender: (data: Uint8Array) => void) {
    this.sender = sender
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
    if (btn === 0) return 0x02
    if (btn === 2) return 0x08
    if (btn === 1) return 0x20
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

  private encodeKeyVirtual(vk: number, isUp: boolean): Uint8Array {
    const buf = new Uint8Array(6)
    buf[0] = 0x00
    buf[1] = 0x01 // InputType.KEY
    buf[2] = 0x00
    buf[3] = 0x06 // len 6
    buf[4] = isUp ? 0x01 : 0x00
    buf[5] = vk & 0xff
    return buf
  }

  private encodeKeyUnicode(charCode: number, isUp: boolean): Uint8Array {
    const buf = new Uint8Array(7)
    buf[0] = 0x00
    buf[1] = 0x55 // InputType.KEYUNICODE
    buf[2] = 0x00
    buf[3] = 0x07
    buf[4] = isUp ? 0x01 : 0x00
    buf[5] = (charCode >> 8) & 0xff
    buf[6] = charCode & 0xff
    return buf
  }

  private mapKeyToVirtualKey(e: KeyboardEvent): number | null {
    const key = e.key
    const code = e.code
    // Function keys F1..F12
    if (/^F([1-9]|1[0-2])$/.test(key)) {
      const n = parseInt(key.substring(1), 10)
      return 0x6f + n // 0x70..0x7b
    }
    const map: Record<string, number> = {
      Backspace: 0x08,
      Tab: 0x09,
      Enter: 0x0d,
      Escape: 0x1b,
      Esc: 0x1b,
      ' ': 0x20,
      Space: 0x20,
      PageUp: 0x21,
      PageDown: 0x22,
      End: 0x23,
      Home: 0x24,
      ArrowLeft: 0x25,
      ArrowUp: 0x26,
      ArrowRight: 0x27,
      ArrowDown: 0x28,
      Insert: 0x2d,
      Delete: 0x2e,
      Shift: 0x10,
      ShiftLeft: 0x10,
      ShiftRight: 0x10,
      Control: 0x11,
      ControlLeft: 0x11,
      ControlRight: 0x11,
      Alt: 0x12,
      AltLeft: 0x12,
      AltRight: 0x12,
      Meta: 0x5b,
      MetaLeft: 0x5b,
      MetaRight: 0x5c,
      ContextMenu: 0x5d,
      CapsLock: 0x14,
    }
    if (map[key] != null) return map[key]
    if (map[code] != null) return map[code]
    return null
  }

  // Placeholder: draw a simple indicator for incoming frames until decoder is integrated
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
        } catch {}
        if ('close' in it.bitmap && typeof (it.bitmap as any).close === 'function') {
          try { (it.bitmap as any).close() } catch {}
        }
        if (it.url) { try { URL.revokeObjectURL(it.url) } catch {} }
      }
    })
  }
}


