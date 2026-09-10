import { GPSPoint, UnitSystem } from '../types';

const EARTH_RADIUS_METERS = 6371000;

/**
 * Calculates the Haversine distance between two geographic coordinates in meters.
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
}

/**
 * Computes total cumulative distance across an array of GPS points in meters.
 */
export function calculateTotalDistance(points: GPSPoint[]): number {
  if (!points || points.length < 2) return 0;

  let totalMeters = 0;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    totalMeters += haversineDistance(
      prev.latitude,
      prev.longitude,
      curr.latitude,
      curr.longitude
    );
  }
  return totalMeters;
}

/**
 * Calculates pace in seconds per kilometer (or seconds per mile).
 */
export function calculatePace(
  distanceMeters: number,
  durationSeconds: number,
  unit: UnitSystem = 'km'
): number {
  if (distanceMeters <= 0 || durationSeconds <= 0) return 0;

  const distanceInUnits =
    unit === 'mi' ? distanceMeters / 1609.344 : distanceMeters / 1000;

  if (distanceInUnits === 0) return 0;
  return durationSeconds / distanceInUnits;
}

/**
 * Formats seconds into pace string (e.g. "5:12 /km" or "8:22 /mi").
 */
export function formatPace(paceSeconds: number, unit: UnitSystem = 'km'): string {
  if (!paceSeconds || !isFinite(paceSeconds) || paceSeconds <= 0) {
    return `--:-- /${unit}`;
  }

  const mins = Math.floor(paceSeconds / 60);
  const secs = Math.floor(paceSeconds % 60);
  const paddedSecs = secs < 10 ? `0${secs}` : `${secs}`;

  return `${mins}:${paddedSecs} /${unit}`;
}

/**
 * Formats seconds into digital timer display "HH:MM:SS" or "MM:SS".
 */
export function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) return '00:00';

  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const pMins = mins < 10 ? `0${mins}` : `${mins}`;
  const pSecs = secs < 10 ? `0${secs}` : `${secs}`;

  if (hrs > 0) {
    const pHrs = hrs < 10 ? `0${hrs}` : `${hrs}`;
    return `${pHrs}:${pMins}:${pSecs}`;
  }

  return `${pMins}:${pSecs}`;
}

/**
 * Formats distance in meters into human readable text (e.g. "4.21 km" or "850 m").
 */
export function formatDistance(meters: number, unit: UnitSystem = 'km'): string {
  if (meters <= 0) return unit === 'mi' ? '0.00 mi' : '0.00 km';

  if (unit === 'mi') {
    const miles = meters / 1609.344;
    return `${miles.toFixed(2)} mi`;
  }

  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }

  const km = meters / 1000;
  return `${km.toFixed(2)} km`;
}

/**
 * Formats area in square meters into human readable text (e.g., "1,248 m²").
 */
export function formatArea(sqMeters: number): string {
  if (!sqMeters || sqMeters <= 0) return '0 m²';

  if (sqMeters >= 1_000_000) {
    const sqKm = sqMeters / 1_000_000;
    return `${sqKm.toFixed(2)} km²`;
  }

  return `${Math.round(sqMeters).toLocaleString()} m²`;
}
