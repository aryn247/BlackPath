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
 */
export function smoothPath(points: GPSPoint[], windowSize: number = 3): GPSPoint[] {
  if (!points || points.length <= windowSize) return points;

  const smoothed: GPSPoint[] = [];

  for (let i = 0; i < points.length; i++) {
    if (i < Math.floor(windowSize / 2) || i >= points.length - Math.floor(windowSize / 2)) {
      smoothed.push(points[i]);
      continue;
    }

    let sumLat = 0;
    let sumLon = 0;
    let count = 0;

    for (let j = i - Math.floor(windowSize / 2); j <= i + Math.floor(windowSize / 2); j++) {
      sumLat += points[j].latitude;
      sumLon += points[j].longitude;
      count++;
    }

    smoothed.push({
      ...points[i],
      latitude: sumLat / count,
      longitude: sumLon / count,
    });
  }

  return smoothed;
}
