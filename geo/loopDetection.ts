import { GPSPoint } from '../types';
import { haversineDistance, calculateTotalDistance } from './distance';

export interface LoopDetectionResult {
  isLoop: boolean;
  closureDistanceMeters: number;
  startIndex: number;
  endIndex: number;
}

const DEFAULT_LOOP_THRESHOLD_METERS = 25; // User must be within 25m of start point
const MIN_TOTAL_WALK_DISTANCE_METERS = 100; // Walk must be at least 100m total
const MIN_WALK_POINTS = 10;
const MAX_ALLOWABLE_GPS_ACCURACY = 25; // Reasonable GPS accuracy required

/**
 * Checks if the walk session forms a closed loop.
 */
export function detectLoop(
  points: GPSPoint[],
  thresholdMeters: number = DEFAULT_LOOP_THRESHOLD_METERS,
  minTotalDistanceMeters: number = MIN_TOTAL_WALK_DISTANCE_METERS
): LoopDetectionResult {
  const nullResult: LoopDetectionResult = {
    isLoop: false,
    closureDistanceMeters: Infinity,
    startIndex: 0,
    endIndex: 0,
  };

  if (!points || points.length < MIN_WALK_POINTS) {
    return nullResult;
  }

  const totalDist = calculateTotalDistance(points);
  if (totalDist < minTotalDistanceMeters) {
    return nullResult;
  }

  const latestPoint = points[points.length - 1];

  if (latestPoint.accuracy && latestPoint.accuracy > MAX_ALLOWABLE_GPS_ACCURACY) {
    return nullResult;
  }

  // Scan initial start candidate region (first 25% of points) for loop closure
  const candidateWindowEnd = Math.max(1, Math.floor(points.length * 0.25));

  for (let i = 0; i < candidateWindowEnd; i++) {
    const candidateStart = points[i];
    if (candidateStart.accuracy && candidateStart.accuracy > MAX_ALLOWABLE_GPS_ACCURACY) {
      continue;
    }

    const distToStart = haversineDistance(
      latestPoint.latitude,
      latestPoint.longitude,
      candidateStart.latitude,
      candidateStart.longitude
    );

    if (distToStart <= thresholdMeters) {
      return {
        isLoop: true,
        closureDistanceMeters: distToStart,
        startIndex: i,
        endIndex: points.length - 1,
      };
    }
  }

  return nullResult;
}
