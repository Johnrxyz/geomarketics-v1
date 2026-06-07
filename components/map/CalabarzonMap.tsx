"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { marketsApi } from "@/lib/api";

// Fix for default marker icons in Leaflet with Next.js
const customIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const selectedIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export default function CalabarzonMap({ onMarketSelect, selectedMarketId }: { onMarketSelect?: (m: any) => void, selectedMarketId?: string | number }) {
  const [markets, setMarkets] = useState<any[]>([]);

  useEffect(() => {
    marketsApi.list().then((data: any) => {
      // Mock coordinates if backend doesn't have them yet, based on province
      const coordinates: Record<string, [number, number]> = {
        'Cavite': [14.2833, 120.9333],
        'Laguna': [14.1667, 121.2500],
        'Batangas': [13.7500, 121.0500],
        'Rizal': [14.5833, 121.1667],
        'Quezon': [13.9333, 121.6167],
      };
      
      const mapped = (data.results || data || []).map((m: any, idx: number) => {
        // Add some jitter so markets in the same province don't overlap completely
        const base = coordinates[m.province] || [14.1, 121.1];
        const lat = base[0] + (Math.random() - 0.5) * 0.2;
        const lng = base[1] + (Math.random() - 0.5) * 0.2;
        return { ...m, lat, lng };
      });
      setMarkets(mapped);
    });
  }, []);

  return (
    <div style={{ height: "400px", width: "100%", borderRadius: "var(--radius-lg)", overflow: "hidden", boxShadow: "var(--shadow-md)" }}>
      <MapContainer center={[14.1, 121.1]} zoom={8} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {markets.map((m) => (
          <Marker 
            key={m.id} 
            position={[m.lat, m.lng]} 
            icon={selectedMarketId?.toString() === m.id.toString() ? selectedIcon : customIcon}
            eventHandlers={{
              click: () => onMarketSelect && onMarketSelect(m)
            }}
          >
            <Popup>
              <div style={{ fontWeight: 600, color: "var(--color-accent)" }}>{m.name}</div>
              <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{m.province}</div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
