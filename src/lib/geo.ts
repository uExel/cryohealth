// Haversine distance in km between two lat/lng points.
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Glacier status → relative hazard weight for ranking associations.
export const glacierStatusWeight: Record<string, number> = {
  surging: 1.0,
  retreating: 0.85,
  advancing: 0.6,
  stable: 0.3,
  unknown: 0.4,
};

// Composite "association score": closer + more hazardous = higher.
// distanceKm: 0 → 1, falls off with a 25 km soft radius.
export function glacierLakeAssocScore(distanceKm: number, status: string | null | undefined): number {
  const proximity = 1 / (1 + distanceKm / 25);
  const hazard = glacierStatusWeight[status ?? "unknown"] ?? 0.4;
  return proximity * 0.6 + hazard * 0.4;
}