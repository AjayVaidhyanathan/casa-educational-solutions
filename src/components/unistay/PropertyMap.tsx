'use client';

import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Property } from '@/lib/unistay/types';

const CITY_COORDS: Record<string, [number, number]> = {
  Berlin:     [52.520, 13.405],
  Munich:     [48.137, 11.576],
  Hamburg:    [53.551, 10.000],
  Frankfurt:  [50.110,  8.682],
  Cologne:    [50.938,  6.960],
  Stuttgart:  [48.775,  9.182],
  Düsseldorf: [51.227,  6.774],
  Dusseldorf: [51.227,  6.774],
  Leipzig:    [51.340, 12.374],
  Dresden:    [51.050, 13.738],
  Nuremberg:  [49.452, 11.077],
  Mannheim:   [49.487,  8.466],
  Dortmund:   [51.514,  7.465],
  Bremen:     [53.075,  8.807],
  Hannover:   [52.374,  9.738],
  Karlsruhe:  [49.006,  8.403],
  Augsburg:   [48.370, 10.898],
  Freiburg:   [47.999,  7.842],
  Heidelberg: [49.398,  8.672],
  Bielefeld:  [52.021,  8.532],
  Münster:    [51.962,  7.626],
  Bonn:       [50.735,  7.100],
  Wiesbaden:  [50.082,  8.240],
  Mainz:      [49.999,  8.274],
  Kiel:       [54.323, 10.133],
  Aachen:     [50.776,  6.084],
  Rostock:    [54.092, 12.099],
  Erfurt:     [50.978, 11.029],
  Kassel:     [51.312,  9.479],
};

// Deterministic per-property offset so pins in the same city spread out
function cityJitter(id: string): [number, number] {
  let h = 5381;
  for (const c of id) h = ((h << 5) + h + c.charCodeAt(0)) & 0xffffffff;
  const lat = ((h & 0xffff) / 65535 - 0.5) * 0.04;
  const lng = (((h >> 16) & 0xffff) / 65535 - 0.5) * 0.06;
  return [lat, lng];
}

function getCoords(p: Property): [number, number] | null {
  if (p.lat && p.lng) return [p.lat, p.lng];
  const base = CITY_COORDS[p.city];
  if (!base) return null;
  const [dLat, dLng] = cityJitter(p.id);
  return [base[0] + dLat, base[1] + dLng];
}

function makePricePin(price: number, selected: boolean) {
  const label = price >= 1000 ? `€${(price / 1000).toFixed(1)}k` : `€${price}`;
  const bg = selected ? '#2563eb' : '#0f172a';
  const border = selected ? '#93c5fd' : 'white';
  const scale = selected ? 'scale(1.18)' : 'scale(1)';
  return L.divIcon({
    className: '',
    html: `<div style="
      background:${bg};color:white;
      border:2px solid ${border};
      border-radius:999px;
      padding:3px 8px;
      font-size:11px;font-weight:700;
      white-space:nowrap;
      box-shadow:0 2px 8px rgba(0,0,0,0.28);
      cursor:pointer;
      transform:${scale};
      transition:transform 0.12s;
    ">${label}</div>`,
    iconSize: [60, 26],
    iconAnchor: [30, 13],
  });
}

type Pin = Property & { coords: [number, number] };

function BoundsController({ pins }: { pins: Pin[] }) {
  const map = useMap();
  useEffect(() => {
    if (pins.length === 0) return;
    if (pins.length === 1) { map.setView(pins[0].coords, 14); return; }
    const bounds = L.latLngBounds(pins.map((p) => p.coords));
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 14, animate: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pins.map((p) => p.id).join(',')]);
  return null;
}

interface PropertyMapProps {
  properties: Property[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}

export default function PropertyMap({ properties, selectedId, onSelect }: PropertyMapProps) {
  const pins: Pin[] = useMemo(() => {
    const result: Pin[] = [];
    for (const p of properties) {
      const coords = getCoords(p);
      if (coords) result.push({ ...p, coords });
      if (result.length >= 150) break;
    }
    return result;
  }, [properties]);

  return (
    <MapContainer
      center={[51.165, 10.451]}
      zoom={6}
      className="w-full h-full"
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <BoundsController pins={pins} />

      {pins.map((p) => (
        <Marker
          key={p.id}
          position={p.coords}
          icon={makePricePin(p.price, p.id === selectedId)}
          eventHandlers={{ click: () => onSelect?.(p.id) }}
          zIndexOffset={p.id === selectedId ? 1000 : 0}
        >
          <Popup>
            <div style={{ minWidth: 160, fontFamily: 'inherit' }}>
              <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{p.title}</p>
              <p style={{ color: '#6b7280', fontSize: 11, marginBottom: 6 }}>
                {p.address ? `${p.address}, ` : ''}{p.city}
              </p>
              <p style={{ fontWeight: 700, color: '#2563eb', fontSize: 15, marginBottom: 8 }}>
                €{p.price}<span style={{ fontWeight: 400, color: '#9ca3af', fontSize: 11 }}>/mo</span>
              </p>
              {p.source === 'housinganywhere' ? (
                <a
                  href={(p as { externalUrl: string }).externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display:'block', background:'#2563eb', color:'white', textDecoration:'none', textAlign:'center', padding:'5px 12px', borderRadius:20, fontSize:11, fontWeight:600 }}
                >
                  View on HousingAnywhere
                </a>
              ) : (
                <a
                  href={`/unistay/properties/${p.id}`}
                  style={{ display:'block', background:'#2563eb', color:'white', textDecoration:'none', textAlign:'center', padding:'5px 12px', borderRadius:20, fontSize:11, fontWeight:600 }}
                >
                  View listing
                </a>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
