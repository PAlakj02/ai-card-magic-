// Computes hand metrics from MediaPipe landmarks and scores them against a trick's reference keyframes
import type { LandmarkPoint } from './scoreMovement'

export interface HandMetrics {
  fingerCurl: [number, number, number, number, number] // thumb, index, middle, ring, pinky (0=extended, 1=curled)
  pinkyExtraCurl: number   // how much more curled pinky is vs ring (break indicator)
  thumbCurl: number        // isolated thumb curl
  curlVariance: number     // variance across index/middle/ring (lower = more consistent grip)
  handPresent: boolean
  frameCount: number
}

export interface ScoreBreakdown {
  score: number
  tier: 'excellent' | 'good' | 'poor'
  summary: string
  fingerFeedback: Partial<Record<'thumb' | 'index' | 'middle' | 'ring' | 'pinky', string>>
  keyFrameHint?: string
}

function dist(a: LandmarkPoint, b: LandmarkPoint): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2)
}

// Curl ratio: 0 = fully extended, ~0.5 = natural resting curl, ~0.9 = fist
function curl(base: LandmarkPoint, mid: LandmarkPoint, tip: LandmarkPoint): number {
  const extended = dist(base, mid) + dist(mid, tip)
  const actual   = dist(base, tip)
  return Math.max(0, Math.min(1, 1 - actual / extended))
}

function metricsFromFrame(lm: LandmarkPoint[]): Omit<HandMetrics, 'frameCount'> {
  const tc = curl(lm[1], lm[2], lm[4])    // thumb:  CMC→MCP→TIP
  const ic = curl(lm[5], lm[6], lm[8])    // index:  MCP→PIP→TIP
  const mc = curl(lm[9], lm[10], lm[12])  // middle: MCP→PIP→TIP
  const rc = curl(lm[13], lm[14], lm[16]) // ring:   MCP→PIP→TIP
  const pc = curl(lm[17], lm[18], lm[20]) // pinky:  MCP→PIP→TIP
  const avg3    = (ic + mc + rc) / 3
  const variance = ((ic - avg3) ** 2 + (mc - avg3) ** 2 + (rc - avg3) ** 2) / 3
  return {
    fingerCurl:    [tc, ic, mc, rc, pc],
    pinkyExtraCurl: Math.max(0, pc - rc),
    thumbCurl:     tc,
    curlVariance:  variance,
    handPresent:   true,
  }
}

export function computeAverageMetrics(frames: LandmarkPoint[][]): HandMetrics {
  if (frames.length === 0) {
    return { fingerCurl: [0, 0, 0, 0, 0], pinkyExtraCurl: 0, thumbCurl: 0, curlVariance: 1, handPresent: false, frameCount: 0 }
  }
  const mets = frames.map(metricsFromFrame)
  const avg  = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length
  return {
    fingerCurl: [0, 1, 2, 3, 4].map(i => avg(mets.map(m => m.fingerCurl[i]))) as [number, number, number, number, number],
    pinkyExtraCurl: avg(mets.map(m => m.pinkyExtraCurl)),
    thumbCurl:      avg(mets.map(m => m.thumbCurl)),
    curlVariance:   avg(mets.map(m => m.curlVariance)),
    handPresent:    true,
    frameCount:     frames.length,
  }
}

// Scores a Double Lift dealer's grip against reference keyframes
// Criteria: hand present (20) + finger curl (30) + pinky break (20) + thumb range (15) + consistency (15)
export function scoreDoubleLift(
  metrics: HandMetrics,
  reference: Record<string, unknown> | null,
): ScoreBreakdown {
  const keyFrames = (reference?.keyFrames as Array<{ stage: string; description: string }> | undefined) ?? []

  if (!metrics.handPresent || metrics.frameCount < 10) {
    return {
      score: 0,
      tier: 'poor',
      summary: 'No hand detected. Hold your hand clearly in front of the camera and try again.',
      fingerFeedback: {},
      keyFrameHint: keyFrames[0] ? `Start with: ${keyFrames[0].stage} — ${keyFrames[0].description.slice(0, 90)}` : undefined,
    }
  }

  const [, ic, mc, rc] = metrics.fingerCurl
  const avgMainCurl = (ic + mc + rc) / 3
  const feedback: ScoreBreakdown['fingerFeedback'] = {}
  let score = 0

  // 1. Hand present — 20 pts
  score += 20

  // 2. Dealer's grip curl (15–60%) — 30 pts
  if (avgMainCurl >= 0.15 && avgMainCurl <= 0.60) {
    score += 30
  } else if (avgMainCurl < 0.15) {
    score += Math.round((avgMainCurl / 0.15) * 30)
    feedback.index  = 'Fingers are too straight — curl them into a natural dealer\'s grip'
    feedback.middle = 'Let your middle finger rest in a slight natural curl'
  } else {
    score += Math.round(Math.max(0, 1 - (avgMainCurl - 0.60) / 0.30) * 30)
    feedback.ring = 'Grip is too tight — relax your fingers slightly'
  }

  // 3. Pinky break hint (pinky > ring curl) — 20 pts
  if (metrics.pinkyExtraCurl >= 0.06) {
    score += 20
  } else {
    score += Math.round((metrics.pinkyExtraCurl / 0.06) * 20)
    feedback.pinky = 'Press your pinky gently under the top two cards to create the break'
  }

  // 4. Thumb in resting range (5–45%) — 15 pts
  if (metrics.thumbCurl >= 0.05 && metrics.thumbCurl <= 0.45) {
    score += 15
  } else if (metrics.thumbCurl < 0.05) {
    score += Math.round((metrics.thumbCurl / 0.05) * 15)
    feedback.thumb = 'Extend your thumb along the left long edge of the deck'
  } else {
    score += Math.round(Math.max(0, 1 - (metrics.thumbCurl - 0.45) / 0.30) * 15)
    feedback.thumb = 'Thumb is over-curled — let it rest naturally against the deck\'s side'
  }

  // 5. Grip consistency — 15 pts
  if (metrics.curlVariance < 0.04) {
    score += 15
  } else {
    score += Math.round(Math.max(0, 1 - metrics.curlVariance / 0.12) * 15)
    if (!feedback.index && !feedback.middle) {
      feedback.index = 'Keep an even curl across all fingers — avoid uneven pressure distribution'
    }
  }

  score = Math.min(100, Math.max(0, score))
  const tier: ScoreBreakdown['tier'] = score >= 75 ? 'excellent' : score >= 50 ? 'good' : 'poor'

  const hintStage = keyFrames[tier === 'excellent' ? 0 : 1]

  return {
    score,
    tier,
    summary:
      tier === 'excellent' ? 'Perfect dealer\'s grip — your hand position matches the Double Lift technique exactly.' :
      tier === 'good'      ? 'Good attempt. Your grip is mostly correct — refine the pinky break and finger curl.' :
                             'Keep practicing. Focus on the specific positions highlighted below.',
    fingerFeedback: feedback,
    keyFrameHint: hintStage
      ? `${hintStage.stage}: ${hintStage.description.slice(0, 110)}…`
      : undefined,
  }
}
