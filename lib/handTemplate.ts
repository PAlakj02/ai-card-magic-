// Procedurally builds a canonical 21-point hand landmark pose from a target finger-curl
// spec, so real keypoint-distance scoring has a numeric ground truth to compare against
// (there is no recorded reference performance for these tricks — see references/{trickName}).
// Curl semantics match lib/handScoring.ts's curl(): 0 = fully extended, ~1 = fully curled.
import type { LandmarkPoint } from './scoreMovement'

export interface CurlSpec {
  thumb:  number
  index:  number
  middle: number
  ring:   number
  pinky:  number
}

interface FingerSpec {
  fanAngleDeg: number          // direction of the extended finger, 0 = straight up (away from wrist)
  baseDist:    number          // WRIST → base joint (CMC for thumb, MCP for the rest)
  segLengths:  [number, number, number]
}

// Relative proportions loosely matching MediaPipe hand topology; absolute scale doesn't
// matter since every pose is re-normalized (translate + scale + rotate) before comparison.
const FINGERS: Record<keyof CurlSpec, FingerSpec> = {
  thumb:  { fanAngleDeg: -55, baseDist: 0.30, segLengths: [0.20, 0.25, 0.20] },
  index:  { fanAngleDeg: -15, baseDist: 0.55, segLengths: [0.28, 0.17, 0.15] },
  middle: { fanAngleDeg: 0,   baseDist: 0.58, segLengths: [0.31, 0.19, 0.16] },
  ring:   { fanAngleDeg: 15,  baseDist: 0.54, segLengths: [0.29, 0.18, 0.15] },
  pinky:  { fanAngleDeg: 30,  baseDist: 0.48, segLengths: [0.24, 0.14, 0.12] },
}

// Landmark index of each finger's base joint (P0), matching MediaPipe Hands topology
const BASE_INDEX: Record<keyof CurlSpec, number> = {
  thumb: 1, index: 5, middle: 9, ring: 13, pinky: 17,
}

const CURL_TARGET_ANGLE = 180 // "fully curled" direction: pointing back down toward the wrist

function toRad(deg: number): number { return (deg * Math.PI) / 180 }
function dir(angleDeg: number): [number, number] { return [Math.sin(toRad(angleDeg)), Math.cos(toRad(angleDeg))] }
function bendToward(angleDeg: number, targetDeg: number, t: number): number { return angleDeg + (targetDeg - angleDeg) * t }

function buildFinger(spec: FingerSpec, curl: number, wrist: LandmarkPoint): LandmarkPoint[] {
  const c = Math.max(0, Math.min(1, curl))
  const [bx, by] = dir(spec.fanAngleDeg)
  const p0: LandmarkPoint = { x: wrist.x + bx * spec.baseDist, y: wrist.y + by * spec.baseDist, z: 0 }

  const angle1 = spec.fanAngleDeg                                  // P0→P1: fixed, matches handScoring's fixed MCP anchor
  const angle2 = bendToward(spec.fanAngleDeg, CURL_TARGET_ANGLE, c * 0.55) // P1→P2: bends with curl
  const angle3 = bendToward(angle2, CURL_TARGET_ANGLE, c * 0.6)     // P2→P3: bends further

  const [d1x, d1y] = dir(angle1)
  const p1: LandmarkPoint = { x: p0.x + d1x * spec.segLengths[0], y: p0.y + d1y * spec.segLengths[0], z: 0 }

  const [d2x, d2y] = dir(angle2)
  const p2: LandmarkPoint = { x: p1.x + d2x * spec.segLengths[1], y: p1.y + d2y * spec.segLengths[1], z: 0 }

  const [d3x, d3y] = dir(angle3)
  const p3: LandmarkPoint = { x: p2.x + d3x * spec.segLengths[2], y: p2.y + d3y * spec.segLengths[2], z: 0 }

  return [p0, p1, p2, p3]
}

/** Builds a full 21-point MediaPipe-shaped hand pose matching the given per-finger curl targets. */
export function buildHandPose(curls: CurlSpec): LandmarkPoint[] {
  const wrist: LandmarkPoint = { x: 0, y: 0, z: 0 }
  const landmarks: LandmarkPoint[] = new Array(21).fill(null).map(() => ({ x: 0, y: 0, z: 0 }))
  landmarks[0] = wrist

  for (const finger of Object.keys(FINGERS) as (keyof CurlSpec)[]) {
    const points = buildFinger(FINGERS[finger], curls[finger], wrist)
    const base = BASE_INDEX[finger]
    for (let i = 0; i < 4; i++) landmarks[base + i] = points[i]
  }

  return landmarks
}

// Per-trick curl targets derived from the grip descriptions already stored in
// references/{trickName}.keyFrames and the ideal ranges in lib/handScoring.ts.
export const TRICK_CURL_SPECS: Record<string, CurlSpec> = {
  'Double Lift': { thumb: 0.25, index: 0.375, middle: 0.375, ring: 0.375, pinky: 0.465 },
  'Charlier Cut': { thumb: 0.08, index: 0.12, middle: 0.12, ring: 0.12, pinky: 0.12 },
  'False Shuffle': { thumb: 0.18, index: 0.40, middle: 0.40, ring: 0.40, pinky: 0.40 },
}
