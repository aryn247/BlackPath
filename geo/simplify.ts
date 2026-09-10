import { GPSPoint } from '../types';

function perpendicularDistance(
  point: GPSPoint,
  lineStart: GPSPoint,
  lineEnd: GPSPoint
): number {
  const x = point.longitude;
  const y = point.latitude;
  const x1 = lineStart.longitude;
  const y1 = lineStart.latitude;
  const x2 = lineEnd.longitude;
  const y2 = lineEnd.latitude;

  const dx = x2 - x1;
  const dy = y2 - y1;

  if (dx === 0 && dy === 0) {
    return Math.hypot(x - x1, y - y1);
  }

  const num = Math.abs(dy * x - dx * y + x2 * y1 - y2 * x1);
  const den = Math.hypot(dx, dy);

  return num / den;
}

/**
 * Simplifies a sequence of GPS points using the Ramer-Douglas-Peucker algorithm.
 * @param points List of GPSPoints
 * @param epsilon Tolerance threshold in degrees (~0.00003 is approx 3 meters)
 */
export function simplifyPath(
  points: GPSPoint[],
  epsilon: number = 0.00003
): GPSPoint[] {
  if (points.length <= 2) return points;

  let maxDistance = 0;
  let index = 0;

  const start = points[0];
  const end = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const distance = perpendicularDistance(points[i], start, end);
    if (distance > maxDistance) {
      index = i;
      maxDistance = distance;
    }
  }

  if (maxDistance > epsilon) {
    const recursiveResult1 = simplifyPath(points.slice(0, index + 1), epsilon);
    const recursiveResult2 = simplifyPath(points.slice(index), epsilon);

    return [...recursiveResult1.slice(0, -1), ...recursiveResult2];
  } else {
    return [start, end];
  }
}
