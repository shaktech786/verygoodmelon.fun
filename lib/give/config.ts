export interface GiveOrganisation {
  name: string
  href: string
}

export interface GiveConfig {
  enabled: boolean
  /** One or two plain sentences naming the organisations and what they do, written by the owner. */
  message?: string
  organisations: readonly GiveOrganisation[]
}

/** The give block stays hidden until the owner chooses organisations and writes its words. */
export const GIVE: GiveConfig = { enabled: false, organisations: [] }
