"use client";

import { useEffect, useRef, useState } from "react";
import { WaterSource, WaterRoute } from "@/types/water";
import { qualityColorMap } from "@/data/waterSources";
import { Report } from "@/lib/supabase";

interface WaterMapProps {
  sources: WaterSource[];
  routes: WaterRoute[];
  reports: Report[];
  onSelectSource: (source: WaterSource | null) => void;
  selectedSource: WaterSource | null;
  onMapClick: (lat: number, lng: number) => void;
  reportingMode: boolean;
  panelOpen: boolean;
}

const typeIcons: Record<string, string> = {
  pozo: "💧",
  presa: "🏞️",
  manantial: "🌊",
};

const reportTypeConfig: Record<string, { icon: string; color: string }> = {
  sin_agua:      { icon: "🚱", color: "#ef4444" },
  fuga:          { icon: "💦", color: "#3b82f6" },
  contaminacion: { icon: "⚠️", color: "#f59e0b" },
  baja_presion:  { icon: "📉", color: "#f97316" },
  otro:          { icon: "📝", color: "#6b7280" },
};

export default function WaterMap({
  sources, routes, reports, onSelectSource, selectedSource, onMapClick, reportingMode, panelOpen,
}: WaterMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polylinesRef = useRef<any[]>([]);
  const reportMarkersRef = useRef<any[]>([]);
  const heatCirclesRef = useRef<any[]>([]);
  const [mapReady, setMapReady] = useState(false);

  // Init map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    import("leaflet").then((L) => {
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(mapRef.current!, { center: [20.6296, -100.3862], zoom: 9, zoomControl: true });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 18,
      }).addTo(map);

      map.on("click", (e: any) => onMapClick(e.latlng.lat, e.latlng.lng));

      mapInstanceRef.current = map;
      setMapReady(true);
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update map click handler when reportingMode changes
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return;
    mapInstanceRef.current.off("click");
    mapInstanceRef.current.on("click", (e: any) => onMapClick(e.latlng.lat, e.latlng.lng));
    mapInstanceRef.current.getContainer().style.cursor = reportingMode ? "crosshair" : "";
  }, [mapReady, reportingMode, onMapClick]);

  // Draw water sources & routes
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return;

    import("leaflet").then((L) => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      polylinesRef.current.forEach((p) => p.remove());
      polylinesRef.current = [];

      routes.forEach((route) => {
        const routeColors: Record<string, string> = { acueducto: "#3b82f6", canal: "#10b981", tuberia: "#8b5cf6" };
        const polyline = L.polyline(route.coordinates as [number, number][], {
          color: routeColors[route.type] || "#6b7280",
          weight: 3,
          opacity: 0.7,
          dashArray: route.type === "tuberia" ? "6, 4" : undefined,
        }).addTo(mapInstanceRef.current);
        polyline.bindTooltip(
          `<b>${route.name}</b><br/>Tipo: ${route.type}<br/>Caudal: ${route.flowRate} L/s<br/>Longitud: ${route.length} km`,
          { sticky: true }
        );
        polylinesRef.current.push(polyline);
      });

      sources.forEach((source) => {
        const color = qualityColorMap[source.qualityLevel];
        const isSelected = selectedSource?.id === source.id;
        const icon = L.divIcon({
          html: `<div style="background:${color};border:${isSelected ? "3px solid #1e40af" : "2px solid white"};border-radius:${source.type === "presa" ? "4px" : "50%"};width:${isSelected ? "36px" : "28px"};height:${isSelected ? "36px" : "28px"};display:flex;align-items:center;justify-content:center;font-size:${isSelected ? "18px" : "14px"};box-shadow:0 2px 6px rgba(0,0,0,0.4);cursor:pointer;${!source.active ? "opacity:0.5;filter:grayscale(60%);" : ""}">
            ${typeIcons[source.type]}</div>`,
          className: "",
          iconSize: [isSelected ? 36 : 28, isSelected ? 36 : 28],
          iconAnchor: [isSelected ? 18 : 14, isSelected ? 18 : 14],
        });
        const marker = L.marker([source.lat, source.lng], { icon })
          .addTo(mapInstanceRef.current)
          .on("click", (e: any) => { e.originalEvent?.stopPropagation(); onSelectSource(source); });
        marker.bindTooltip(
          `<b>${source.name}</b><br/>Calidad: <span style="color:${color}">&#9679;</span> ${source.qualityLevel}<br/>Puntuación: ${source.quality.score}/100`,
          { direction: "top", offset: [0, -10] }
        );
        markersRef.current.push(marker);
      });
    });
  }, [mapReady, sources, routes, selectedSource, onSelectSource]);

  // Draw report markers + heatmap circles
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return;

    import("leaflet").then((L) => {
      reportMarkersRef.current.forEach((m) => m.remove());
      reportMarkersRef.current = [];
      heatCirclesRef.current.forEach((c) => c.remove());
      heatCirclesRef.current = [];

      const activeReports = reports.filter((r) => r.status !== "resuelto");

      // Heatmap: inner + outer rings for each active report
      activeReports.forEach((report) => {
        const cfg = reportTypeConfig[report.type] || reportTypeConfig.otro;
        const outer = L.circle([report.lat, report.lng], {
          radius: 500,
          color: cfg.color,
          fillColor: cfg.color,
          fillOpacity: 0.2,
          weight: 1.5,
          opacity: 0.6,
        }).addTo(mapInstanceRef.current);
        const inner = L.circle([report.lat, report.lng], {
          radius: 200,
          color: cfg.color,
          fillColor: cfg.color,
          fillOpacity: 0.5,
          weight: 0,
        }).addTo(mapInstanceRef.current);
        heatCirclesRef.current.push(outer, inner);
      });

      // Report markers
      reports.forEach((report) => {
        const cfg = reportTypeConfig[report.type] || reportTypeConfig.otro;
        const isResolved = report.status === "resuelto";
        const icon = L.divIcon({
          html: `<div style="background:${isResolved ? "#6b7280" : cfg.color};border:3px solid white;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,0.5);${isResolved ? "opacity:0.5;" : ""}">
            ${cfg.icon}</div>`,
          className: "",
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });
        const marker = L.marker([report.lat, report.lng], { icon, zIndexOffset: -100 })
          .addTo(mapInstanceRef.current);
        marker.bindTooltip(
          `<b>${cfg.icon} ${report.type.replace("_", " ")}</b><br/>📍 ${report.municipality}${report.address ? " · " + report.address : ""}<br/>👤 ${report.user_name || "Anónimo"}<br/>👍 ${report.votes} confirmaciones`,
          { direction: "top", offset: [0, -10] }
        );
        reportMarkersRef.current.push(marker);
      });
    });
  }, [mapReady, reports]);

  return (
    <div className="relative w-full h-full overflow-hidden shadow-lg">
      <div ref={mapRef} className="w-full h-full" />

      {/* Hide zoom controls on mobile when panel is open */}
      {panelOpen && (
        <style>{`.leaflet-control-zoom { display: none !important; }`}</style>
      )}

      {reportingMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-sm px-5 py-2.5 rounded-full shadow-lg z-[1000] flex items-center gap-2 animate-pulse">
          📍 Haz clic en el mapa para marcar el problema
        </div>
      )}

      {/* Legend — hidden on mobile when panel open */}
      {!panelOpen && (
        <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur rounded-lg p-3 shadow-md text-xs z-[1000]">
          <p className="font-semibold text-gray-700 mb-2">Calidad del agua</p>
          {Object.entries(qualityColorMap).map(([level, color]) => (
            <div key={level} className="flex items-center gap-2 mb-1">
              <span style={{ backgroundColor: color }} className="w-3 h-3 rounded-full inline-block" />
              <span className="capitalize text-gray-600">{level}</span>
            </div>
          ))}
          <hr className="my-2 border-gray-200" />
          <p className="font-semibold text-gray-700 mb-1">Reportes</p>
          {Object.entries(reportTypeConfig).map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-1.5 mb-1">
              <span>{cfg.icon}</span>
              <span className="capitalize text-gray-600">{key.replace("_", " ")}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
