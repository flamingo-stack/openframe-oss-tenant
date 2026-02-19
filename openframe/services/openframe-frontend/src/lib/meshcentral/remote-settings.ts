/**
 * MeshCentral Remote Desktop Settings
 */

export interface RemoteSettingsConfig {
  quality: number
  scaling: number
  frameRate: 'smooth' | 'fast' | 'medium' | 'slow' | 'very slow'
  swapMouseButtons: boolean
  useRemoteKeyboardMap: boolean
  invertScrollDirection: boolean
}

// Map quality percentage to JPEG quality value (1-100)
export const QUALITY_OPTIONS = [
  { label: 'Ultra Low (10%)', value: 10 },
  { label: 'Low (20%)', value: 20 },
  { label: 'Medium (40%)', value: 40 },
  { label: 'Balanced (50%)', value: 50 },
  { label: 'High (60%)', value: 60 },
  { label: 'Ultra (80%)', value: 80 },
  { label: 'Lossless (100%)', value: 100 }
] as const

// Map scaling percentage to MeshCentral scaling values
// MeshCentral uses: 256=25%, 512=50%, 768=75%, 1024=100%
export const SCALING_OPTIONS = [
  { label: '25%', value: 256 },     // 256 = 25%
  { label: '50%', value: 512 },     // 512 = 50%
  { label: '75%', value: 768 },     // 768 = 75%
  { label: '100%', value: 1024 },   // 1024 = 100%
  { label: '125%', value: 1280 },   // 1280 = 125%
  { label: '150%', value: 1536 },   // 1536 = 150%
  { label: '200%', value: 2048 }    // 2048 = 200%
] as const

// Map frame rate to milliseconds between frames
export const FRAME_RATE_OPTIONS = [
  { label: 'Smooth (30 FPS)', value: 'smooth', ms: 33 },
  { label: 'Fast (20 FPS)', value: 'fast', ms: 50 },
  { label: 'Medium (10 FPS)', value: 'medium', ms: 100 },
  { label: 'Slow (5 FPS)', value: 'slow', ms: 200 },
  { label: 'Very Slow (2 FPS)', value: 'very slow', ms: 500 }
] as const

export const DEFAULT_SETTINGS: RemoteSettingsConfig = {
  quality: 50,
  scaling: 1024,
  frameRate: 'medium',
  swapMouseButtons: false,
  useRemoteKeyboardMap: false,
  invertScrollDirection: false
}

export class RemoteDesktopSettings {
  private settings: RemoteSettingsConfig
  private websocket: any | null = null

  constructor(initialSettings: RemoteSettingsConfig = DEFAULT_SETTINGS) {
    this.settings = { ...initialSettings }
  }

  setWebSocket(ws: any) {
    this.websocket = ws
  }

  applySettings(settings: RemoteSettingsConfig = this.settings): void {
    if (!this.websocket) {
      console.warn('No websocket available for applying settings')
      return
    }

    try {
      const buffer = new ArrayBuffer(10)
      const view = new DataView(buffer)
      
      // Header
      view.setUint16(0, 0x0005, false)  // Command: COMPRESSION (0x05)
      view.setUint16(2, 0x000A, false)  // Total message size: 10 bytes (4 header + 6 data)
      
      // Settings data - MeshCentral expects BIG-ENDIAN for multi-byte values
      view.setUint8(4, 1)               // Byte 4: Image encoding type (1=JPEG)
      view.setUint8(5, settings.quality) // Byte 5: Quality level (1-100)
      view.setUint16(6, settings.scaling, false) // Bytes 6-7: Scaling factor
      
      const frameRateOption = FRAME_RATE_OPTIONS.find(opt => opt.value === settings.frameRate)
      view.setUint16(8, frameRateOption?.ms || 100, false) // Bytes 8-9: Frame timer (ms)
      
      const binaryData = new Uint8Array(buffer)
      this.websocket.sendBinary(binaryData)
      
      this.settings = { ...settings }
    } catch (error) {
      console.error('Failed to apply settings:', error)
      throw error
    }
  }

  getSettings(): RemoteSettingsConfig {
    return { ...this.settings }
  }

  static getFrameRateMs(frameRate: RemoteSettingsConfig['frameRate']): number {
    const option = FRAME_RATE_OPTIONS.find(opt => opt.value === frameRate)
    return option?.ms || 100
  }

  estimateBandwidth(): number {
    const base = 100 // Base KB/s
    const qualityFactor = this.settings.quality / 100
    const scalingFactor = this.settings.scaling / 1024
    const fpsFactor = 100 / RemoteDesktopSettings.getFrameRateMs(this.settings.frameRate)
    
    return Math.floor(base * qualityFactor * scalingFactor * fpsFactor)
  }
}
