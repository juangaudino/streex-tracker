import { zoneCellCenter } from "@/lib/zoneIntelligence";

/**
 * Requests one broad place suggestion only after the owner selects a private
 * zone. The request uses the existing coarse-cell centre, never raw GPS.
 */
export async function suggestBroadZoneLabel(zoneKey: string): Promise<string | null> {
  const center = zoneCellCenter(zoneKey);
  if (!center) return null;
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("zoom", "10");
  url.searchParams.set("lat", center.latitude.toFixed(3));
  url.searchParams.set("lon", center.longitude.toFixed(3));
  url.searchParams.set("addressdetails", "1");
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) return null;
  const payload = await response.json() as { address?: Record<string, string> };
  const address = payload.address ?? {};
  return address.city ?? address.town ?? address.village ?? address.municipality ?? address.suburb ?? address.county ?? null;
}
