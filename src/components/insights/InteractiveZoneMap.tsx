import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { zoneCellBounds } from "@/lib/zoneIntelligence";
import type { ZoneFlow, ZoneIntelligenceMode, ZoneIntelligenceZone } from "@/lib/zoneIntelligence";

function colorFor(mode: ZoneIntelligenceMode, value: number, maximum: number) {
  const opacity = value > 0 ? 0.28 + (value / Math.max(maximum, 1)) * 0.52 : 0.12;
  return mode === "earnings" ? { color: "#d8b800", fillColor: "#e6ce20", fillOpacity: opacity } : { color: "#0ea5e9", fillColor: "#38bdf8", fillOpacity: opacity };
}

export default function InteractiveZoneMap({ zones, flows, mode, selectedZoneKey, labelFor, onSelectZone }: {
  zones: ZoneIntelligenceZone[];
  flows: ZoneFlow[];
  mode: ZoneIntelligenceMode;
  selectedZoneKey?: string | null;
  labelFor: (zoneKey: string) => string;
  onSelectZone: (zoneKey: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const fittedZoneSignatureRef = useRef("");

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { zoomControl: true, scrollWheelZoom: true, attributionControl: true });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);
    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);
    return () => { map.remove(); mapRef.current = null; layerRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    const selectedFlows = selectedZoneKey ? flows.filter((flow) => flow.fromZoneKey === selectedZoneKey) : [];
    const maxActivity = Math.max(...zones.map((zone) => zone.pickupCount + zone.dropoffCount), 1);
    const maxEarnings = Math.max(...zones.map((zone) => zone.eligibleEarnings), 1);
    const maxFlow = Math.max(...selectedFlows.map((flow) => flow.rides), 1);
    const bounds: L.LatLngBoundsExpression[] = [];
    zones.forEach((zone) => {
      const cellBounds = zoneCellBounds(zone.zoneKey);
      if (!cellBounds) return;
      bounds.push(cellBounds);
      const flowValue = selectedZoneKey ? selectedFlows.find((flow) => flow.toZoneKey === zone.zoneKey)?.rides ?? (zone.zoneKey === selectedZoneKey ? maxFlow : 0) : 0;
      const value = mode === "earnings" ? zone.eligibleEarnings : mode === "flow" ? flowValue : zone.pickupCount + zone.dropoffCount;
      const maximum = mode === "earnings" ? maxEarnings : mode === "flow" ? maxFlow : maxActivity;
      const active = zone.zoneKey === selectedZoneKey;
      const rectangle = L.rectangle(cellBounds, { ...colorFor(mode, value, maximum), weight: active ? 4 : 2, dashArray: active ? undefined : "4 3" });
      rectangle.bindTooltip(labelFor(zone.zoneKey), { sticky: true, direction: "top" });
      rectangle.on("click", () => onSelectZone(zone.zoneKey));
      rectangle.addTo(layer);
    });
    const zoneSignature = zones.map((zone) => zone.zoneKey).sort().join("|");
    if (bounds.length && fittedZoneSignatureRef.current !== zoneSignature) {
      fittedZoneSignatureRef.current = zoneSignature;
      map.fitBounds(L.latLngBounds(bounds), { padding: [28, 28], maxZoom: 12, animate: false });
    }
  }, [flows, labelFor, mode, onSelectZone, selectedZoneKey, zones]);

  return <div ref={containerRef} className="relative mt-4 h-[390px] overflow-hidden rounded-xl border border-border" aria-label="Interactive approximate zone map" />;
}
