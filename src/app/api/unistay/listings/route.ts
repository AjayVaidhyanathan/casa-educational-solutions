import type { ExternalProperty, PropertyType } from '@/lib/unistay/types';
import { NextRequest } from 'next/server';

const FEED_URL = 'https://housinganywhere.com/feeds/CASASolutions/CASASolutions.json';

// Normalize city names from the feed to match our filter values
const CITY_MAP: Record<string, string> = {
  'Frankfurt am Main': 'Frankfurt',
  'Köln': 'Cologne',
  'Nürnberg': 'Nuremberg',
  'München': 'Munich',
};

function normalizeCity(city: string): string {
  return CITY_MAP[city] ?? city;
}

type HAFacilities = Record<string, { value: string }>;

function mapType(kindLabel: string, bedrooms: number): PropertyType {
  if (kindLabel === 'shared room') return 'shared';
  if (kindLabel === 'private room') return 'room';
  if (bedrooms === 0) return 'studio';
  return 'apartment';
}

function mapFeatures(fac: HAFacilities): string[] {
  const f: string[] = [];
  if (fac.wifi?.value === 'yes') f.push('wifi');
  if (fac.bedroomFurnished?.value === 'yes' || fac.roomFurniture?.value === 'yes') f.push('furnished');
  if (
    fac.electricityCostIncluded?.value === 'yes' &&
    fac.gasCostIncluded?.value === 'yes' &&
    fac.waterCostIncluded?.value === 'yes'
  ) f.push('bills');
  if (fac.parking?.value === 'yes') f.push('parking');
  if (fac.balconyTerrace?.value === 'private' || fac.balconyTerrace?.value === 'shared') f.push('balcony');
  return f;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transform(l: any): ExternalProperty | null {
  const price = parseFloat(l.costsFormatted?.price ?? '0');
  if (price <= 0) return null;

  const fac: HAFacilities = l.facilities ?? {};
  const size = Math.round(parseFloat(fac.totalSize?.value ?? '0'));
  const bedrooms = parseInt(fac.bedrooms?.value ?? '1') || 1;
  const avail = l.available?.[0]?.from ?? '';
  const img =
    l.images?.[0]?.sizes?.['1024x768']?.link ??
    l.images?.[0]?.originalLink ??
    '';

  const lat = typeof l.location?.geoPoint?.lat === 'number' ? l.location.geoPoint.lat : undefined;
  const lng = typeof l.location?.geoPoint?.lng === 'number' ? l.location.geoPoint.lng : undefined;

  return {
    source: 'housinganywhere',
    id: `ha-${l.id}`,
    title: l.title,
    type: mapType(l.kindLabel, bedrooms),
    city: normalizeCity(l.location.city),
    address: [l.location.street, l.location.neighborhood].filter(Boolean).join(', '),
    price: Math.round(price),
    bedrooms,
    size,
    availableFrom: avail,
    image: img,
    features: mapFeatures(fac),
    externalUrl: l.originalLink,
    lat,
    lng,
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const city = searchParams.get('city') ?? '';
  const type = searchParams.get('type') ?? '';
  const minPrice = parseInt(searchParams.get('minPrice') ?? '0');
  const maxPrice = parseInt(searchParams.get('maxPrice') ?? '99999');
  const bedrooms = searchParams.get('bedrooms') ?? 'all';

  let feedData: { listings: unknown[] };
  try {
    const res = await fetch(FEED_URL, { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error(`Feed returned ${res.status}`);
    feedData = await res.json();
  } catch {
    return Response.json({ error: 'Failed to fetch listings' }, { status: 502 });
  }

  const listings: ExternalProperty[] = [];
  for (const raw of feedData.listings) {
    const p = transform(raw);
    if (!p) continue;
    if (city && !p.city.toLowerCase().includes(city.toLowerCase()) && !city.toLowerCase().includes(p.city.toLowerCase())) continue;
    if (type && p.type !== type) continue;
    if (p.price < minPrice || p.price > maxPrice) continue;
    if (bedrooms !== 'all' && p.bedrooms !== parseInt(bedrooms)) continue;
    listings.push(p);
    if (listings.length >= 200) break;
  }

  return Response.json(listings, {
    headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
  });
}
