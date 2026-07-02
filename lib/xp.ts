// XP thresholds, level derivation, and rank titles — single source of truth used by authActions, Home, and Profile
export const XP_TABLE: Record<number, number> = {
  1: 0,
  2: 500,
  3: 1200,
  4: 2500,
  5: 4500,
  6: 7000,
  7: 10000,
  8: 14000,
}

export const MAX_LEVEL = 8

export const RANK_TITLES: Record<number, string> = {
  1: 'Novice',
  2: 'Apprentice',
  3: 'Student',
  4: 'Practitioner',
  5: 'Adept',
  6: 'Expert',
  7: 'Sleight Master',
  8: 'Grand Master',
}

export function levelFromXP(totalXP: number): number {
  let level = 1
  for (let l = 1; l <= MAX_LEVEL; l++) {
    if (totalXP >= (XP_TABLE[l] ?? 0)) level = l
    else break
  }
  return level
}

export function rankTitle(level: number): string {
  return RANK_TITLES[Math.min(Math.max(level, 1), MAX_LEVEL)] ?? 'Grand Master'
}

// XP progress within the current level — use for progress bars and "X XP to next level" text
export function xpProgress(totalXP: number): {
  level:   number
  current: number  // XP earned inside current level
  needed:  number  // total XP span of this level (0 at max level)
  pct:     number  // 0-100 progress within the level
} {
  const level = levelFromXP(totalXP)
  if (level >= MAX_LEVEL) {
    return { level, current: totalXP - (XP_TABLE[MAX_LEVEL] ?? 0), needed: 0, pct: 100 }
  }
  const start   = XP_TABLE[level]     ?? 0
  const end     = XP_TABLE[level + 1] ?? 0
  const current = totalXP - start
  const needed  = end - start
  return {
    level,
    current,
    needed,
    pct: needed === 0 ? 100 : Math.min(100, Math.round((current / needed) * 100)),
  }
}
