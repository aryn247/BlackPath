import { GPSPoint } from '../types';
import { haversineDistance } from './distance';

const MAX_ACCEPTABLE_ACCURACY_METERS = 30; // Reject points with accuracy > 30m
const MAX_HUMAN_SPEED_MPS = 18; // ~65 km/h, max realistic running/sprinting speed
const MIN_DISTANCE_DELTA_METERS = 1.0; // Filter out stationary GPS noise jitter

/**
 * Validates whether a new GPS point is reasonable compared to the previous point.
 */
export function isValidGPSPoint(
  newPoint: GPSPoint,
  lastPoint?: GPSPoint
): boolean {
  if (!newPoint) return false;

  // Filter 1: Poor Accuracy
  if (newPoint.accuracy && newPoint.accuracy > MAX_ACCEPTABLE_ACCURACY_METERS) {
    return false;
  }

  if (!lastPoint) return true;

  // Filter 2: Stationary noise
  const dist = haversineDistance(
    lastPoint.latitude,
    lastPoint.longitude,
    newPoint.latitude,
    newPoint.longitude
  );

  const timeDeltaSec = (newPoint.timestamp - lastPoint.timestamp) / 1000;

  if (timeDeltaSec <= 0) return false;

  // Filter 3: Teleportation / Speed Spikes
  const calculatedSpeed = dist / timeDeltaSec;
  if (calculatedSpeed > MAX_HUMAN_SPEED_MPS) {
    return false;
  }

  // Filter 4: Ignore micro jitter when stationary (< 1 meter movement in < 2 seconds)
  if (dist < MIN_DISTANCE_DELTA_METERS && timeDeltaSec < 2) {
    return false;
  }

  return true;
}

/**
 * Applies a moving average window to smooth lat/lon coordinates for fluid rendering.
 * Capped to max 300 points for constant-time performance on long walks.
 */
export function smoothPath(points: GPSPoint[], windowSize: number = 3): GPSPoint[] {
  if (!points || points.length <= windowSize) return points;

  // Cap points to max 300 for constant time processing on long walks
  const targetPoints = points.length > 300 ? downsamplePath(points, 300) : points;
  const smoothed: GPSPoint[] = [];
  const halfWindow = Math.floor(windowSize / 2);

  for (let i = 0; i < targetPoints.length; i++) {
    if (i < halfWindow || i >= targetPoints.length - halfWindow) {
      smoothed.push(targetPoints[i]);
      continue;
    }

    let sumLat = 0;
    let sumLon = 0;

    for (let j = i - halfWindow; j <= i + halfWindow; j++) {
      sumLat += targetPoints[j].latitude;
      sumLon += targetPoints[j].longitude;
    }

    smoothed.push({
      ...targetPoints[i],
      latitude: sumLat / windowSize,
      longitude: sumLon / windowSize,
    });
  }

  return smoothed;
}

/**
 * Downsamples GPS point array to cap max points for ultra-fast rendering & memory efficiency.
 */
export function downsamplePath(points: GPSPoint[], maxPoints: number = 300): GPSPoint[] {
  if (!points || points.length <= maxPoints) return points;

  const result: GPSPoint[] = [points[0]];
  const step = (points.length - 1) / (maxPoints - 1);

  for (let i = 1; i < maxPoints - 1; i++) {
    const idx = Math.floor(i * step);
    result.push(points[idx]);
  }

  result.push(points[points.length - 1]);
  return result;
}

/**
 * Converts array of 2D screen points (x, y) into a smooth cubic Bezier SVG path string.
 */
export function pointsToBezierPath(pts: { x: number; y: number }[]): string {
  if (!pts || pts.length === 0) return '';
  if (pts.length === 1) return `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  if (pts.length === 2) {
    return `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)} L ${pts[1].x.toFixed(1)} ${pts[1].y.toFixed(1)}`;
  }

  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;

  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i === 0 ? i : i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2 < pts.length ? i + 2 : i + 1];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;

    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }

  return d;
}
