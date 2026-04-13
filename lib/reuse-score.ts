import type { VideoResult, VideoLicense } from './types'

export interface ReuseScore {
  score: number          // 0–100
  label: string          // short display label
  detail: string         // one-sentence explanation shown in tooltip
  tier: 'safe' | 'caution' | 'risky'
}

// Base scores by license type
const LICENSE_SCORES: Record<VideoLicense, number> = {
  'royalty-free': 97,
  'creative-commons': 72,
  'standard': 18,
  'unknown': 22,
}

// Small per-platform adjustment on top of the license base
const PLATFORM_BONUS: Record<VideoResult['platform'], number> = {
  pexels: 1,
  pixabay: 0,
  freepik: -4,   // premium license — great, but requires active subscription
  youtube: 0,
}

const LICENSE_DETAIL: Record<VideoLicense, string> = {
  'royalty-free':
    'Free to use commercially with no attribution required. Always confirm the specific platform license before publishing.',
  'creative-commons':
    'Licensed under Creative Commons — typically free to reuse with attribution. Check the exact CC variant (CC-BY, CC-BY-SA, etc.) on the source page.',
  'standard':
    'Standard copyright applies. You must get explicit permission from the rights holder before using this in your own content.',
  'unknown':
    'License could not be determined. Treat as fully copyrighted and verify before any reuse.',
}

function tier(score: number): ReuseScore['tier'] {
  if (score >= 80) return 'safe'
  if (score >= 50) return 'caution'
  return 'risky'
}

function labelForScore(score: number, license: VideoLicense, platform: VideoResult['platform']): string {
  if (license === 'royalty-free') {
    return platform === 'freepik' ? 'Licensed Stock' : 'Royalty-Free'
  }
  if (license === 'creative-commons') return 'Creative Commons'
  if (license === 'standard') return '© Protected'
  return 'Unknown License'
}

export function getReuseScore(video: VideoResult): ReuseScore {
  const license: VideoLicense = video.license ?? 'unknown'
  const base = LICENSE_SCORES[license]
  const bonus = PLATFORM_BONUS[video.platform]
  const score = Math.min(100, Math.max(0, base + bonus))

  return {
    score,
    label: labelForScore(score, license, video.platform),
    detail: LICENSE_DETAIL[license],
    tier: tier(score),
  }
}

// Tailwind color classes per tier
export const TIER_COLORS = {
  safe: {
    bg: 'bg-green-900/40',
    border: 'border-green-700/40',
    text: 'text-green-400',
    dot: 'bg-green-400',
  },
  caution: {
    bg: 'bg-yellow-900/30',
    border: 'border-yellow-700/40',
    text: 'text-yellow-400',
    dot: 'bg-yellow-400',
  },
  risky: {
    bg: 'bg-red-900/30',
    border: 'border-red-700/40',
    text: 'text-red-400',
    dot: 'bg-red-500',
  },
}
