import { GPSPoint } from '../types';

const EARTH_RADIUS_METERS = 6371000;

/**
 * Calculates the enclosed area of a polygon defined by GPSPoints in square meters using Shoelace formula.
 * @param points Array of GPS points forming a loop
 */
export function calculateClosedLoopArea(points: GPSPoint[]): number {
  if (!points || points.length < 3) return 0;

  // 1. Calculate centroid lat/lon to establish local Cartesian origin
  let sumLat = 0;
  let sumLon = 0;
  for (const pt of points) {
    sumLat += pt.latitude;
    sumLon += pt.longitude;
  }
  const centroidLat = (sumLat / points.length) * (Math.PI / 180);

  // 2. Project lat/lon to local (x, y) Cartesian plane in meters relative to centroid
  const planarPoints: { x: number; y: number }[] = points.map((pt) => {
    const latRad = (pt.latitude * Math.PI) / 180;
    const lonRad = (pt.longitude * Math.PI) / 180;

    const x = EARTH_RADIUS_METERS * lonRad * Math.cos(centroidLat);
    const y = EARTH_RADIUS_METERS * latRad;

    return { x, y };
  });

  // 3. Apply Gauss's Shoelace formula: Area = 0.5 * |sum(x_i * y_{i+1} - x_{i+1} * y_i)|
  let areaSum = 0;
  const n = planarPoints.length;

  for (let i = 0; i < n; i++) {
    const current = planarPoints[i];
    const next = planarPoints[(i + 1) % n];

    areaSum += current.x * next.y - next.x * current.y;
  }

  const calculatedArea = Math.abs(areaSum) / 2;

  // Return non-negative area rounded
  return isNaN(calculatedArea) ? 0 : Math.round(calculatedArea);
}
