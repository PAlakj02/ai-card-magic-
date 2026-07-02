/**
 * scoreMovement — isolated scoring stub.
 * Replace the body with real gesture classification logic when the ML model is ready.
 * The webcam/tracking/UI code never needs to change.
 */

export interface LandmarkPoint {
  x: number
  y: number
  z: number
}

export interface ScoreResult {
  accuracy: number       // 0–100
  feedback: string
  isCorrect: boolean
}

/**
 * Currently returns hardcoded mock results.
 * To upgrade: pass the landmark array through your real model here.
 */
export function scoreMovement(landmarks: LandmarkPoint[][]): ScoreResult {
  // TODO: replace with real model inference
  // e.g. const prediction = model.predict(preprocessLandmarks(landmarks))
  if (!landmarks || landmarks.length === 0) {
    return { accuracy: 0, feedback: 'No hand detected', isCorrect: false }
  }
  // Mock: base 72 + slight variance to simulate live feedback
  const mock = 72 + Math.floor((landmarks[0][0].x * 100) % 20)
  return {
    accuracy: Math.min(mock, 98),
    feedback: mock >= 80 ? 'Great technique! Keep the break invisible.' : 'Watch your thumb position on the break.',
    isCorrect: mock >= 75,
  }
}
