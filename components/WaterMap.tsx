"use client";

import { useEffect, useRef, useState } from "react";
import { WaterSource, WaterRoute } from "@/types/water";
import { qualityColorMap } from "@/data/waterSources";

interface WaterMapProps {
  sources: WaterSource[];
  routes: WaterRoute[];
  onSelectSource: (source: WaterSource | null) => void;
  selectedSource: WaterSource | null;
}

const typeIcons: Record<string, string> = {
  pozo: "💧",
  presa: "🏞️",
  manantial: "🌊",
};

export default function WaterMap({ sources, routes, onSelectSource, selectedSource }: WaterMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polylinesRef = useRef<any[]>([]);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    import("leaflet").then((L) => {
      // Fix default icon issue with webpack
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(mapRef.current!, {
        center: [20.6296, -100.3862],
        zoom: 9,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 18,
      }).addTo(map);

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

  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return;

    import("leaflet").then((L) => {
      // Clear existing markers
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      polylinesRef.current.forEach((p) => p.remove());
      polylinesRef.current = [];

      // Draw routes
      routes.forEach((route) => {
        const routeColors: Record<string, string> = {
          acueducto: "#3b82f6",
          canal: "#10b981",
          tuberia: "#8b5cf6",
        };
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

      // Draw markers
      sources.forEach((source) => {
        const color = qualityColorMap[source.qualityLevel];
        const isSelected = selectedSource?.id === source.id;

        const icon = L.divIcon({
          html: `
            <div style="
              background: ${color};
              border: ${isSelected ? "3px solid #1e40af" : "2px solid white"};
              border-radius: ${source.type === "presa" ? "4px" : "50%"};
              width: ${isSelected ? "36px" : "28px"};
              height: ${isSelected ? "36px" : "28px"};
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: ${isSelected ? "18px" : "14px"};
              box-shadow: 0 2px 6px rgba(0,0,0,0.4);
              cursor: pointer;
              transition: all 0.2s;
              ${!source.active ? "opacity: 0.5; filter: grayscale(60%);" : ""}
            ">
              ${typeIcons[source.type]}
            </div>
          `,
          className: "",
          iconSize: [isSelected ? 36 : 28, isSelected ? 36 : 28],
          iconAnchor: [isSelected ? 18 : 14, isSelected ? 18 : 14],
        });

        const marker = L.marker([source.lat, source.lng], { icon })
          .addTo(mapInstanceRef.current)
          .on("click", () => onSelectSource(source));

        marker.bindTooltip(
          `<b>${source.name}</b><br/>Calidad: <span style="color:${color}">&#9679;</span> ${source.qualityLevel}<br/>Puntuación: ${source.quality.score}/100`,
          { direction: "top", offset: [0, -10] }
        );

        markersRef.current.push(marker);
      });
    });
  }, [mapReady, sources, routes, selectedSource, onSelectSource]);

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden shadow-lg">
      <div ref={mapRef} className="w-full h-full" />
      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur rounded-lg p-3 shadow-md text-xs z-[1000]">
        <p className="font-semibold text-gray-700 mb-2">Calidad del agua</p>
        {Object.entries(qualityColorMap).map(([level, color]) => (
          <div key={level} className="flex items-center gap-2 mb-1">
            <span style={{ backgroundColor: color }} className="w-3 h-3 rounded-full inline-block" />
            <span className="capitalize text-gray-600">{level}</span>
          </div>
        ))}
        <hr className="my-2 border-gray-200" />
        <p className="font-semibold text-gray-700 mb-1">Fuentes</p>
        {Object.entries(typeIcons).map(([type, icon]) => (
          <div key={type} className="flex items-center gap-2 mb-1">
            <span>{icon}</span>
            <span className="capitalize text-gray-600">{type}</span>
          </div>
        ))}
        <hr className="my-2 border-gray-200" />
        <p className="font-semibold text-gray-700 mb-1">Rutas</p>
        <div className="flex items-center gap-2 mb-1"><span className="w-4 h-0.5 bg-blue-500 inline-block" /> Acueducto</div>
        <div className="flex items-center gap-2 mb-1"><span className="w-4 h-0.5 bg-emerald-500 inline-block" /> Canal</div>
        <div className="flex items-center gap-2"><span className="w-4 border-t-2 border-dashed border-violet-500 inline-block" /> Tubería</div>
      </div>
    </div>
  );
}
