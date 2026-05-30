'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

type Coords = [number, number];

const CITY_COORDS: Record<string, Coords> = {
  Berlin: [52.520, 13.405], Munich: [48.137, 11.576], Hamburg: [53.551, 10.000],
  Frankfurt: [50.110, 8.682], Cologne: [50.938, 6.960], Stuttgart: [48.775, 9.182],
  Düsseldorf: [51.227, 6.774], Dusseldorf: [51.227, 6.774], Leipzig: [51.340, 12.374],
  Dresden: [51.050, 13.738], Nuremberg: [49.452, 11.077],
};

const PIN_ICON = L.divIcon({
  className: '',
  html: `<div style="
    width:14px;height:14px;background:#2563eb;
    border:2.5px solid white;border-radius:50%;
    box-shadow:0 2px 8px rgba(0,0,0,0.35);
  "></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

function CenterMap({ coords }: { coords: Coords }) {
  const map = useMap();
  useEffect(() => { map.setView(coords, 15); }, [coords, map]);
  return null;
}

interface PropertyDetailMapProps {
  title: string;
  address: string;
  city: string;
  lat?: number;
  lng?: number;
}

export default function PropertyDetailMap({ title, address, city, lat, lng }: PropertyDetailMapProps) {
  const [coords, setCoords] = useState<Coords | null>(lat && lng ? [lat, lng] : null);
  const [loading, setLoading] = useState(!lat || !lng);

  useEffect(() => {
    if (lat && lng) { setCoords([lat, lng]); setLoading(false); return; }
    const query = [address, city, 'Germany'].filter(Boolean).join(', ');
    fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=de`,
      { headers: { 'User-Agent': 'CasaSolutions/1.0 (student-housing-search)' } },
    )
      .then((r) => r.json())
      .then((data: Array<{ lat: string; lon: string }>) => {
        if (data[0]) {
          setCoords([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
        } else {
          const fallback = CITY_COORDS[city];
          if (fallback) setCoords(fallback);
        }
      })
      .catch(() => {
        const fallback = CITY_COORDS[city];
        if (fallback) setCoords(fallback);
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading || !coords) {
    return <div className="w-full h-full bg-gray-100 animate-pulse rounded-xl" />;
  }

  return (
    <MapContainer
      center={coords}
      zoom={15}
      className="w-full h-full"
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <CenterMap coords={coords} />
      <Marker position={coords} icon={PIN_ICON}>
        <Popup>
          <div style={{ fontFamily: 'inherit', minWidth: 150 }}>
            <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{title}</p>
            <p style={{ color: '#6b7280', fontSize: 11 }}>{address}</p>
          </div>
        </Popup>
      </Marker>
    </MapContainer>
  );
}
