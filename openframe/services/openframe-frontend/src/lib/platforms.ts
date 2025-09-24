import { LinuxIcon, MacOSIcon, WindowsIcon } from '@flamingo/ui-kit'

export type PlatformId = 'windows' | 'linux' | 'darwin'

export interface PlatformOption {
  id: PlatformId
  name: string
  icon: React.ComponentType<any>
}

export const PLATFORMS: PlatformOption[] = [
  { id: 'windows', name: 'Windows', icon: WindowsIcon },
  { id: 'linux', name: 'Linux', icon: LinuxIcon },
  { id: 'darwin', name: 'MacOS', icon: MacOSIcon },
]

export const DEFAULT_PLATFORM: PlatformId = 'windows'


