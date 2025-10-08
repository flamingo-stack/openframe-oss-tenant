export type StandardToolKey = 'TACTICAL' | 'FLEET' | 'MESHCENTRAL'

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

  // Fleet
  'FLEET': 'FLEET',
  'FLEET_MDM': 'FLEET',
  'FLEET-MDM': 'FLEET',
  'fleet': 'FLEET',
  'fleet_mdm': 'FLEET',
  'fleet-mdm': 'FLEET',

  // MeshCentral
  'MESHCENTRAL': 'MESHCENTRAL',
  'MESH': 'MESHCENTRAL',
  'mesh': 'MESHCENTRAL',
  'meshcentral': 'MESHCENTRAL',
}

const keyToLabel: Record<StandardToolKey, string> = {
  TACTICAL: 'Tactical',
  FLEET: 'Fleet',
  MESHCENTRAL: 'MeshCentral',
}

const keyToUiKitType: Record<StandardToolKey, 'tactical' | 'fleet' | 'meshcentral'> = {
  TACTICAL: 'tactical',
  FLEET: 'fleet',
  MESHCENTRAL: 'meshcentral',
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

export function toUiKitToolType(input?: string): 'tactical' | 'fleet' | 'meshcentral' | 'unknown' {
  const key = normalizeToolKey(input)
  return key ? keyToUiKitType[key] : 'unknown'
}


