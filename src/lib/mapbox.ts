// Mapbox's "public" token is designed to be used both in the browser (map rendering,
// exposed as NEXT_PUBLIC_MAPBOX_TOKEN) and for server-side API calls like geocoding —
// unlike Paystack's secret/public split, there's no separate server-only token needed.
function getToken(): string | undefined {
  return process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
}

export function isMapboxConfigured(): boolean {
  return Boolean(getToken());
}

// Best-effort geocode of a free-text location (e.g. "Lekki Phase 1, Lagos, Nigeria") into
// [lng, lat]. Returns null on any failure — listing creation should never be blocked by a
// geocoding miss, it just means that listing won't show a map pin.
export async function geocodeLocation(query: string): Promise<[number, number] | null> {
  const token = getToken();
  if (!token) return null;

  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?country=NG&limit=1&access_token=${token}`;
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    const coordinates = data?.features?.[0]?.center;
    if (!Array.isArray(coordinates) || coordinates.length !== 2) return null;

    return [coordinates[0], coordinates[1]];
  } catch {
    return null;
  }
}
