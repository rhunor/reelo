// MapTiler's key is designed to be used both in the browser (map rendering, exposed as
// NEXT_PUBLIC_MAPTILER_KEY) and for server-side API calls like geocoding — there's no
// separate server-only key needed.
function getKey(): string | undefined {
  return process.env.NEXT_PUBLIC_MAPTILER_KEY;
}

// Best-effort geocode of a free-text location (e.g. "Lekki Phase 1, Lagos, Nigeria") into
// [lng, lat]. Returns null on any failure — listing creation should never be blocked by a
// geocoding miss, it just means that listing won't show a map pin.
export async function geocodeLocation(query: string): Promise<[number, number] | null> {
  const key = getKey();
  if (!key) return null;

  try {
    const url = `https://api.maptiler.com/geocoding/${encodeURIComponent(query)}.json?country=NG&limit=1&key=${key}`;
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
