// Scores a captured practice session by real geometric similarity to a trick's reference
// hand pose (lib/handTemplate.ts) — no hardcoded score values, purely distance-driven.
import type { LandmarkPoint } from './scoreMovement'
import type { ScoreBreakdown } from './handScoring'

type FingerName = 'thumb' | 'index' | 'middle' | 'ring' | 'pinky'

const FINGER_GROUPS: Record<FingerName, number[]> = {
  thumb:  [1, 2, 3, 4],
  index:  [5, 6, 7, 8],
  middle: [9, 10, 11, 12],
  ring:   [13, 14, 15, 16],
  pinky:  [17, 18, 19, 20],
}

// Calibrated against lib/handTemplate.ts poses (see scripts/_tmp_calibrate.ts during
// development): identical poses → 1.0, small tracking noise → ~0.85-0.95, a genuinely
// different grip (e.g. flat open hand vs a curled dealer's grip) → ~0.4-0.6, the polar
// opposite (fist vs an open-handed grip) → clamped to ~0.
const DIST_SCALE = 0.28

function dist2D(a: LandmarkPoint, b: LandmarkPoint): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
}

function rotate(p: LandmarkPoint, angle: number): LandmarkPoint {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  return { x: p.x * cos - p.y * sin, y: p.x * sin + p.y * cos, z: 0 }
}

/**
 * Translates to wrist-origin, scales by hand size (wrist→middle-MCP), and rotates so the
 * hand faces a fixed orientation — removes camera position/distance/rotation as factors,
 * leaving only actual hand-shape (curl/spread) differences to drive the distance.
 */
export function normalizeHand(lm: LandmarkPoint[]): LandmarkPoint[] {
  const wrist = lm[0]
  const translated = lm.map(p => ({ x: p.x - wrist.x, y: p.y - wrist.y, z: 0 }))
  const scale = Math.max(dist2D(translated[9], { x: 0, y: 0, z: 0 }), 1e-6)
  const scaled = translated.map(p => ({ x: p.x / scale, y: p.y / scale, z: 0 }))
  const currentAngle = Math.atan2(scaled[9].y, scaled[9].x)
  const targetAngle = Math.atan2(1, 0)
  const delta = targetAngle - currentAngle
  return scaled.map(p => rotate(p, delta))
}

/** 0–1 similarity between two raw (unnormalized) 21-point hands. */
export function handSimilarity(userLm: LandmarkPoint[], refLm: LandmarkPoint[]): number {
  const a = normalizeHand(userLm)
  const b = normalizeHand(refLm)
  const meanDist = a.reduce((sum, p, i) => sum + dist2D(p, b[i]), 0) / a.length
  return Math.max(0, Math.min(1, 1 - meanDist / DIST_SCALE))
}

function perFingerDistance(userLm: LandmarkPoint[], refLm: LandmarkPoint[]): Record<FingerName, number> {
  const a = normalizeHand(userLm)
  const b = normalizeHand(refLm)
  const out = {} as Record<FingerName, number>
  for (const finger of Object.keys(FINGER_GROUPS) as FingerName[]) {
    const indices = FINGER_GROUPS[finger]
    out[finger] = indices.reduce((sum, i) => sum + dist2D(a[i], b[i]), 0) / indices.length
  }
  return out
}

const FEEDBACK_HINTS: Record<FingerName, string> = {
  thumb:  'Your thumb position/pressure differs most from the reference grip.',
  index:  'Check your index finger curl — it\'s the biggest difference from the reference.',
  middle: 'Your middle finger curl differs most from the reference grip.',
  ring:   'Focus on your ring finger position — it deviates most from the reference.',
  pinky:  'Your pinky position (often the break point) differs most from the reference.',
}

export interface LiveFrameScore {
  accuracy: number // 0-100
  feedback: string
}

/**
 * Real-time per-frame score for the live camera preview badge — uses the exact same
 * handSimilarity()/perFingerDistance() math as scoreSession() below, just applied to a
 * single frame instead of an average across a capture. Deliberately NOT a separate mock:
 * showing the user a different number live than what the final assessment computes is
 * actively misleading (e.g. a live "80% Accuracy" badge next to a final 0/100 result).
 */
export function scoreLiveFrame(
  hands: LandmarkPoint[][],
  referenceKeypoints: LandmarkPoint[] | null,
): LiveFrameScore {
  if (!referenceKeypoints) return { accuracy: 0, feedback: 'Loading reference…' }
  if (hands.length === 0) return { accuracy: 0, feedback: 'Show your hand to the camera…' }

  let bestSim = -1
  let bestDists: Record<FingerName, number> | null = null
  for (const hand of hands) {
    const sim = handSimilarity(hand, referenceKeypoints)
    if (sim > bestSim) {
      bestSim = sim
      bestDists = perFingerDistance(hand, referenceKeypoints)
    }
  }

  const accuracy = Math.round(Math.max(0, Math.min(100, bestSim * 100)))
  if (accuracy >= 75) {
    return { accuracy, feedback: 'Great technique! Your grip matches the reference closely.' }
  }
  if (bestDists) {
    const [worstFinger] = (Object.entries(bestDists) as [FingerName, number][]).sort((a, b) => b[1] - a[1])[0]
    return { accuracy, feedback: FEEDBACK_HINTS[worstFinger] }
  }
  return { accuracy, feedback: 'Keep adjusting your grip.' }
}

const MIN_FRAMES = 10 // average across at least this many hand-present frames, never a single capture

/**
 * Scores a full capture (one entry per sampled frame, each frame an array of detected
 * hands) against a trick's reference pose. Per frame, the best-matching hand is used —
 * this keeps solo-hand tricks robust even if a second (irrelevant) hand is visible.
 */
export function scoreSession(
  frames: LandmarkPoint[][][],
  reference: Record<string, unknown> | null,
): ScoreBreakdown {
  const refKeypoints = (reference?.referenceKeypoints as LandmarkPoint[] | undefined) ?? null
  const keyFrames = (reference?.keyFrames as Array<{ stage: string; description: string }> | undefined) ?? []
  const framesWithHands = frames.filter(f => f.length > 0)

  if (!refKeypoints || framesWithHands.length < MIN_FRAMES) {
    return {
      score: 0,
      tier: 'poor',
      summary: !refKeypoints
        ? 'Reference data for this trick isn\'t available yet — ask an admin to run the reference-generation script.'
        : 'No hand detected. Hold your hand clearly in front of the camera and try again.',
      fingerFeedback: {},
      keyFrameHint: keyFrames[0] ? `Start with: ${keyFrames[0].stage} — ${keyFrames[0].description.slice(0, 90)}` : undefined,
    }
  }

  const frameSimilarities: number[] = []
  const fingerDistanceSums: Record<FingerName, number> = { thumb: 0, index: 0, middle: 0, ring: 0, pinky: 0 }

  for (const hands of framesWithHands) {
    let bestSim = -1
    let bestDists: Record<FingerName, number> | null = null
    for (const hand of hands) {
      const sim = handSimilarity(hand, refKeypoints)
      if (sim > bestSim) {
        bestSim = sim
        bestDists = perFingerDistance(hand, refKeypoints)
      }
    }
    frameSimilarities.push(bestSim)
    if (bestDists) {
      for (const finger of Object.keys(fingerDistanceSums) as FingerName[]) {
        fingerDistanceSums[finger] += bestDists[finger]
      }
    }
  }

  const avgSimilarity = frameSimilarities.reduce((a, b) => a + b, 0) / frameSimilarities.length
  const score = Math.round(Math.max(0, Math.min(100, avgSimilarity * 100)))
  const tier: ScoreBreakdown['tier'] = score >= 75 ? 'excellent' : score >= 50 ? 'good' : 'poor'

  const fingerFeedback: ScoreBreakdown['fingerFeedback'] = {}
  if (tier !== 'excellent') {
    const ranked = (Object.entries(fingerDistanceSums) as [FingerName, number][])
      .map(([finger, sum]) => [finger, sum / framesWithHands.length] as const)
      .sort((a, b) => b[1] - a[1])
    for (const [finger] of ranked.slice(0, tier === 'poor' ? 3 : 1)) {
      fingerFeedback[finger] = FEEDBACK_HINTS[finger]
    }
  }

  const hintStage = keyFrames[tier === 'excellent' ? 0 : 1]

  return {
    score,
    tier,
    summary:
      tier === 'excellent' ? 'Excellent — your hand position closely matches the reference grip.' :
      tier === 'good'      ? 'Good attempt. Your grip is close — refine the fingers flagged below.' :
                              'Keep practicing. Focus on the specific positions highlighted below.',
    fingerFeedback,
    keyFrameHint: hintStage ? `${hintStage.stage}: ${hintStage.description.slice(0, 110)}…` : undefined,
  }
}
