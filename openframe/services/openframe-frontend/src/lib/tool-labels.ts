export type StandardToolKey = 'TACTICAL' | 'FLEET' | 'MESHCENTRAL' | 'OPENFRAME_CHAT' | 'OPENFRAME_CLIENT'

// Map of common variants to a canonical key
const toolAliasToKey: Record<string, StandardToolKey> = {
  // Tactical
  'TACTICAL': 'TACTICAL',
  'TACTICAL_RMM': 'TACTICAL',
  'TACTICAL-RMM': 'TACTICAL',
  'TACTICALRMM': 'TACTICAL',
  'tactical': 'TACTICAL',
  'tactical_rmm': 'TACTICAL',
  'tactical-rmm': 'TACTICAL',
  'tacticalrmm-agent': 'TACTICAL',

  // Fleet
  'FLEET': 'FLEET',
  'FLEET_MDM': 'FLEET',
  'FLEET-MDM': 'FLEET',
  'fleet': 'FLEET',
  'fleet_mdm': 'FLEET',
  'fleet-mdm': 'FLEET',
  'fleetmdm-agent': 'FLEET',

  // MeshCentral
  'MESHCENTRAL': 'MESHCENTRAL',
  'MESH': 'MESHCENTRAL',
  'mesh': 'MESHCENTRAL',
  'meshcentral': 'MESHCENTRAL',
  'meshcentral-agent': 'MESHCENTRAL',

  // OpenFrame Chat
  'OPENFRAME_CHAT': 'OPENFRAME_CHAT',
  'OPENFRAME-CHAT': 'OPENFRAME_CHAT',
  'openframe_chat': 'OPENFRAME_CHAT',
  'openframe-chat': 'OPENFRAME_CHAT',
  
  // OpenFrame Client
  'OPENFRAME_CLIENT': 'OPENFRAME_CLIENT',
  'OPENFRAME-CLIENT': 'OPENFRAME_CLIENT',
  'openframe_client': 'OPENFRAME_CLIENT',
  'openframe-client': 'OPENFRAME_CLIENT',
}

const keyToLabel: Record<StandardToolKey, string> = {
  TACTICAL: 'Tactical',
  FLEET: 'Fleet',
  MESHCENTRAL: 'MeshCentral',
  OPENFRAME_CHAT: 'OpenFrame Chat',
  OPENFRAME_CLIENT: 'OpenFrame Client',
}

const keyToUiKitType: Record<StandardToolKey, 'TACTICAL_RMM' | 'FLEET_MDM' | 'MESHCENTRAL' | 'OPENFRAME_CHAT' | 'OPENFRAME_CLIENT'> = {
  TACTICAL: 'TACTICAL_RMM',
  FLEET: 'FLEET_MDM',
  MESHCENTRAL: 'MESHCENTRAL',
  OPENFRAME_CHAT: 'OPENFRAME_CHAT',
  OPENFRAME_CLIENT: 'OPENFRAME_CLIENT',
}

export function normalizeToolKey(input?: string): StandardToolKey | undefined {
  if (!input) return undefined
  const exact = toolAliasToKey[input]
  if (exact) return exact
  const upper = input.toUpperCase()
  if (toolAliasToKey[upper]) return toolAliasToKey[upper]
  const lower = input.toLowerCase()
  if (toolAliasToKey[lower]) return toolAliasToKey[lower]
  return undefined
}

export function toolKeyToLabel(key?: StandardToolKey): string {
  if (!key) return ''
  return keyToLabel[key]
}

export function toStandardToolLabel(input?: string): string {
  const key = normalizeToolKey(input)
  return key ? keyToLabel[key] : input || ''
}

export function toUiKitToolType(input?: string): 'TACTICAL_RMM' | 'FLEET_MDM' | 'MESHCENTRAL' | 'AUTHENTIK' | 'OPENFRAME' | 'OPENFRAME_CHAT' | 'OPENFRAME_CLIENT' | 'SYSTEM' {
  const key = normalizeToolKey(input)
  if (key) return keyToUiKitType[key]

  // Handle other tool types that don't need normalization
  const upper = input?.toUpperCase()
  if (upper === 'AUTHENTIK') return 'AUTHENTIK'
  if (upper === 'OPENFRAME') return 'OPENFRAME'
  if (upper === 'SYSTEM') return 'SYSTEM'

  return 'SYSTEM' // Default fallback
}


