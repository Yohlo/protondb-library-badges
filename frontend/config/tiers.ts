export const TIERS = ['platinum', 'gold', 'silver', 'bronze', 'borked', 'pending', 'unknown'] as const;
export type Tier = (typeof TIERS)[number];

export interface Rating {
  tier: Tier;
  total: number;
}

interface TierInfo {
  color: string;
  label: string;
  description: string;
}

export const TIER_INFO: Record<Tier, TierInfo> = {
  platinum: { color: '#4fd1ff', label: 'Platinum', description: 'Works perfectly out of the box' },
  gold:     { color: '#cfb53b', label: 'Gold',     description: 'Works great with minor issues' },
  silver:   { color: '#a8a9ad', label: 'Silver',   description: 'Works with workarounds' },
  bronze:   { color: '#cd7f32', label: 'Bronze',   description: 'Runs, but with significant issues' },
  borked:   { color: '#ff4444', label: 'Borked',   description: 'Does not run under Proton' },
  pending:  { color: '#8f98a0', label: 'Pending',  description: 'Not enough reports yet' },
  unknown:  { color: '#5c6670', label: 'No data',  description: 'No ProtonDB reports for this game' },
};

const isTier = (value: unknown): value is Tier =>
  typeof value === 'string' && (TIERS as readonly string[]).includes(value);

export function normalizeTier(raw: unknown): Tier {
  const lowered = typeof raw === 'string' ? raw.toLowerCase() : '';
  return isTier(lowered) ? lowered : 'unknown';
}

export function tierMarkerCss(selector: string): string {
  return `
  ${selector} { background: var(--pdb-color); box-shadow: 0 0 0 1px rgba(0,0,0,.45); }
  ${selector}[data-tier="pending"] { background: transparent; box-shadow: inset 0 0 0 1.5px var(--pdb-color), 0 0 0 1px rgba(0,0,0,.45); }
  ${selector}[data-tier="unknown"] { background: radial-gradient(circle, #000 0 2px, transparent 2.5px); box-shadow: none; }
  `;
}
