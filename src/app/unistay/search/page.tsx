'use client';

import { useState, useCallback, useEffect, useRef, useMemo, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams, useRouter } from 'next/navigation';
import { X, ChevronDown, Search, Calendar, MapPin, Loader2 } from 'lucide-react';
import { PropertyCard } from '@/components/unistay/PropertyCard';
import { Breadcrumbs } from '@/components/unistay/ui/breadcrumbs';
import { useFirestoreListings } from '@/lib/unistay/useFirestoreListings';
import { casaProperties } from '@/lib/unistay/properties';
import type { ExternalProperty, FilterValues } from '@/lib/unistay/types';
import { applyFilters, sortProperties } from '@/lib/unistay/searchUtils';

// Map loaded client-side only (Leaflet requires browser APIs)
const PropertyMap = dynamic(() => import('@/components/unistay/PropertyMap'), { ssr: false });

/* ── Date helpers ─────────────────────────────────────────────────────────── */
function tomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}
function firstOfNextMonth(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1, 1);
  return d.toISOString().split('T')[0];
}

/* ── Constants ────────────────────────────────────────────────────────────── */
const DEFAULT_FILTERS: FilterValues = {
  search: '', type: '', city: '',
  minPrice: 0, maxPrice: 3000,
  bedrooms: 'all', features: [],
  dateFrom: '', dateTo: '',
  source: '',
};

const SORT_OPTIONS = [
  { value: 'featured',   label: 'Featured first' },
  { value: 'price-asc',  label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'newest',     label: 'Available soonest' },
];



type OpenPill = 'dates' | 'price' | 'type' | 'source' | null;

const TYPE_OPTIONS = [
  { value: '',          label: 'Any type' },
  { value: 'studio',    label: 'Studio' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'room',      label: 'Private Room' },
  { value: 'shared',    label: 'Shared Room' },
];

const MO = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function fmtS(d: string) {
  if (!d) return '';
  const [,m,dy] = d.split('-');
  return `${parseInt(dy)} ${MO[parseInt(m)-1]}`;
}

/* ── Main component ───────────────────────────────────────────────────────── */
function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const PAGE_SIZE = 25;
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [sortBy,       setSortBy]       = useState('featured');
  const [openPill,     setOpenPill]     = useState<OpenPill>(null);
  const [selectedId,   setSelectedId]   = useState<string | null>(null);
  const [haListings,   setHaListings]   = useState<ExternalProperty[]>([]);
  const [haLoading,    setHaLoading]    = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [cities,       setCities]       = useState<string[]>([]);
  const [suggestOpen,  setSuggestOpen]  = useState(false);
  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pillBarRef   = useRef<HTMLDivElement>(null);

  const { listings: firestoreListings, loading: listingsLoading, error: listingsError } = useFirestoreListings();

  const [filters, setFilters] = useState<FilterValues>(() => ({
    ...DEFAULT_FILTERS,
    type:     searchParams.get('type') ?? '',
    city:     '',
    // Pre-fill search bar: city param takes priority, then keyword q param
    search:   searchParams.get('city') ?? searchParams.get('q') ?? '',
    minPrice: Number(searchParams.get('minPrice') ?? 0),
    maxPrice: Number(searchParams.get('maxPrice') ?? 3000),
    bedrooms: searchParams.get('bedrooms') ?? 'all',
    features: searchParams.get('features')?.split(',').filter(Boolean) ?? [],
    dateFrom: searchParams.get('from') || '',
    dateTo:   searchParams.get('to')   || '',
  }));

  // Set default dates only on the client to avoid SSR/client hydration mismatch
  useEffect(() => {
    setFilters((f) => ({
      ...f,
      dateFrom: f.dateFrom || tomorrow(),
      dateTo:   f.dateTo   || firstOfNextMonth(),
    }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchHA = useCallback((f: FilterValues) => {
    if (!f.search) { setHaListings([]); setHaLoading(false); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setHaLoading(true);
      try {
        const p = new URLSearchParams();
        p.set('city', f.search); // search text drives city filter on HA feed
        if (f.type) p.set('type', f.type);
        if (f.minPrice > 0)    p.set('minPrice', String(f.minPrice));
        if (f.maxPrice < 3000) p.set('maxPrice', String(f.maxPrice));
        if (f.bedrooms && f.bedrooms !== 'all') p.set('bedrooms', f.bedrooms);
        const res = await fetch(`/api/unistay/listings?${p}`);
        if (res.ok) setHaListings(await res.json()); // eslint-disable-line react-hooks/set-state-in-effect
      } finally {
        setHaLoading(false); // eslint-disable-line react-hooks/set-state-in-effect
      }
    }, 300);
  }, []);

  useEffect(() => { fetchHA(filters); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load city list for search suggestions
  useEffect(() => {
    fetch('/api/unistay/cities').then((r) => r.json()).then((data: string[]) => setCities(data)).catch(() => {}); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);

  const syncUrl = useCallback((f: FilterValues) => {
    const p = new URLSearchParams();
    if (f.search) p.set('q', f.search);
    if (f.type)   p.set('type', f.type);
    if (f.minPrice > 0)    p.set('minPrice', String(f.minPrice));
    if (f.maxPrice < 3000) p.set('maxPrice', String(f.maxPrice));
    if (f.bedrooms && f.bedrooms !== 'all') p.set('bedrooms', f.bedrooms);
    if (f.features.length) p.set('features', f.features.join(','));
    if (f.dateFrom) p.set('from', f.dateFrom);
    if (f.dateTo)   p.set('to',   f.dateTo);
    router.replace(`/unistay/search?${p.toString()}`, { scroll: false });
  }, [router]);

  function handleFilterChange(f: FilterValues) { setFilters(f); syncUrl(f); fetchHA(f); setVisibleCount(PAGE_SIZE); }
  function handleSearchInput(v: string) { const n = { ...filters, search: v }; setFilters(n); syncUrl(n); fetchHA(n); setVisibleCount(PAGE_SIZE); }
  function handleClear() { setFilters(DEFAULT_FILTERS); setHaListings([]); setOpenPill(null); setVisibleCount(PAGE_SIZE); router.replace('/unistay/search', { scroll: false }); }

  // Merge: Firestore versions of Casa listings win over static; static fills gaps
  const firestoreIds = new Set(firestoreListings.map((p) => p.id));
  const staticFallback = casaProperties.filter((p) => !firestoreIds.has(p.id));
  const sorted  = sortProperties(applyFilters([...firestoreListings, ...staticFallback, ...haListings], filters), sortBy);
  const loading = listingsLoading || haLoading;

  // Infinite scroll — load next page when sentinel enters viewport
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || visibleCount >= sorted.length) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisibleCount((v) => v + PAGE_SIZE); },
      { rootMargin: '200px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [sorted.length, visibleCount]);

  // Close pill dropdowns on outside click
  useEffect(() => {
    if (!openPill) return;
    function handler(e: MouseEvent) {
      if (pillBarRef.current && !pillBarRef.current.contains(e.target as Node)) setOpenPill(null);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openPill]);

  // City suggestions (starts-with ranked first, then includes)
  const citySuggestions = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    if (!q) return [];
    return cities
      .filter((c) => c.toLowerCase().includes(q))
      .sort((a, b) => {
        const al = a.toLowerCase(), bl = b.toLowerCase();
        return (bl.startsWith(q) ? 1 : 0) - (al.startsWith(q) ? 1 : 0) || a.localeCompare(b);
      })
      .slice(0, 6);
  }, [filters.search, cities]);

  // Pill label helpers
  const dateLabel = filters.dateFrom
    ? `${fmtS(filters.dateFrom)}${filters.dateTo ? ` – ${fmtS(filters.dateTo)}` : ''}`
    : 'Dates';
  const priceLabel = (filters.minPrice > 0 || filters.maxPrice < 3000)
    ? `€${filters.minPrice}–€${filters.maxPrice}`
    : 'Price';
  const typeLabel = filters.type
    ? (TYPE_OPTIONS.find((o) => o.value === filters.type)?.label ?? 'Type')
    : 'Property type';

  const pill = (active: boolean) =>
    `flex items-center gap-1.5 h-9 px-3.5 rounded-full border text-sm font-medium transition-colors shrink-0 whitespace-nowrap ${
      active ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400 shadow-sm'
    }`;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 pt-4 pb-12 lg:pt-6">

        {/* Nav */}
        <div className="flex items-center gap-4 mb-4">
          <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 transition-colors shrink-0">
            <ChevronDown className="h-4 w-4 rotate-90" /> Back
          </button>
          <Breadcrumbs crumbs={[{ label: 'Home', href: '/' }, { label: 'UniStay', href: '/unistay/browse' }, { label: 'Search results' }]} className="" />
        </div>

        {/* ── Pill filter bar ── */}
        {/* No overflow-x-auto here — each pill is relative so its dropdown positions correctly */}
        <div ref={pillBarRef} className="flex flex-wrap items-center gap-2 mb-4">

          {/* Search input — flex-1 so it fills available space, with city suggestions */}
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none z-10" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => { handleSearchInput(e.target.value); setSuggestOpen(e.target.value.trim().length > 0); }}
              onFocus={() => { if (filters.search.trim().length > 0) setSuggestOpen(true); }}
              onBlur={() => setTimeout(() => setSuggestOpen(false), 150)}
              placeholder="City or keyword…"
              className="w-full h-9 rounded-full border border-gray-200 bg-white pl-8 pr-7 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-sm"
            />
            {filters.search && (
              <button onClick={() => { handleSearchInput(''); setSuggestOpen(false); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 z-10">
                <X className="h-3 w-3" />
              </button>
            )}
            {suggestOpen && citySuggestions.length > 0 && (
              <div className="absolute top-full mt-1.5 left-0 right-0 z-50 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                {citySuggestions.map((city) => (
                  <button
                    key={city}
                    onMouseDown={(e) => { e.preventDefault(); handleSearchInput(city); setSuggestOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors ${
                      filters.search === city ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                    {city}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="w-px h-5 bg-gray-200 shrink-0" />

          {/* Dates pill */}
          <div className="relative shrink-0">
            <button onClick={() => setOpenPill(openPill === 'dates' ? null : 'dates')}
              className={pill(openPill === 'dates' || !!(filters.dateFrom || filters.dateTo))}>
              <Calendar className="h-3.5 w-3.5" />
              {dateLabel}
              <ChevronDown className="h-3 w-3 opacity-60" />
            </button>
            {openPill === 'dates' && (
              <div className="absolute top-full mt-2 left-0 z-50 bg-white border border-gray-200 rounded-2xl shadow-xl p-4 min-w-[240px]">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Move-in</p>
                <input type="date" value={filters.dateFrom}
                  onChange={(e) => handleFilterChange({ ...filters, dateFrom: e.target.value })}
                  className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm text-gray-700 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Move-out</p>
                <input type="date" value={filters.dateTo} min={filters.dateFrom}
                  onChange={(e) => handleFilterChange({ ...filters, dateTo: e.target.value })}
                  className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm text-gray-700 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <div className="flex justify-between border-t pt-3">
                  <button onClick={() => handleFilterChange({ ...filters, dateFrom: '', dateTo: '' })} className="text-sm text-gray-500 hover:text-gray-700">Clear</button>
                  <button onClick={() => setOpenPill(null)} className="text-sm font-semibold text-blue-600 hover:text-blue-700">Done</button>
                </div>
              </div>
            )}
          </div>

          {/* Price pill */}
          <div className="relative shrink-0">
            <button onClick={() => setOpenPill(openPill === 'price' ? null : 'price')}
              className={pill(openPill === 'price' || filters.minPrice > 0 || filters.maxPrice < 3000)}>
              {priceLabel}
              <ChevronDown className="h-3 w-3 opacity-60" />
            </button>
            {openPill === 'price' && (
              <div className="absolute top-full mt-2 left-0 z-50 bg-white border border-gray-200 rounded-2xl shadow-xl p-4 min-w-[220px]">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-3">Monthly rent</p>
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex-1">
                    <p className="text-xs text-gray-400 mb-1">Min</p>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-gray-400">€</span>
                      <input type="number" min={0} max={filters.maxPrice} value={filters.minPrice || ''}
                        onChange={(e) => handleFilterChange({ ...filters, minPrice: Number(e.target.value) || 0 })}
                        placeholder="0"
                        className="w-full h-9 rounded-lg border border-gray-200 pl-6 pr-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </div>
                  </div>
                  <span className="text-gray-300 text-lg mt-4">–</span>
                  <div className="flex-1">
                    <p className="text-xs text-gray-400 mb-1">Max</p>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-gray-400">€</span>
                      <input type="number" min={filters.minPrice} value={filters.maxPrice < 3000 ? filters.maxPrice : ''}
                        onChange={(e) => handleFilterChange({ ...filters, maxPrice: Number(e.target.value) || 3000 })}
                        placeholder="Any"
                        className="w-full h-9 rounded-lg border border-gray-200 pl-6 pr-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-between border-t pt-3">
                  <button onClick={() => handleFilterChange({ ...filters, minPrice: 0, maxPrice: 3000 })} className="text-sm text-gray-500 hover:text-gray-700">Clear</button>
                  <button onClick={() => setOpenPill(null)} className="text-sm font-semibold text-blue-600 hover:text-blue-700">Apply</button>
                </div>
              </div>
            )}
          </div>

          {/* Property type pill */}
          <div className="relative shrink-0">
            <button onClick={() => setOpenPill(openPill === 'type' ? null : 'type')}
              className={pill(openPill === 'type' || !!filters.type)}>
              {typeLabel}
              <ChevronDown className="h-3 w-3 opacity-60" />
            </button>
            {openPill === 'type' && (
              <div className="absolute top-full mt-2 left-0 z-50 bg-white border border-gray-200 rounded-2xl shadow-xl py-2 min-w-[170px]">
                {TYPE_OPTIONS.map((opt) => (
                  <button key={opt.value}
                    onClick={() => { handleFilterChange({ ...filters, type: opt.value }); setOpenPill(null); }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${filters.type === opt.value ? 'bg-blue-50 text-blue-700 font-semibold' : 'hover:bg-gray-50 text-gray-700'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Source pill */}
          <div className="relative shrink-0">
            <button onClick={() => setOpenPill(openPill === 'source' ? null : 'source')}
              className={pill(openPill === 'source' || !!filters.source)}>
              {filters.source === 'casa' ? 'Casa only' : filters.source === 'external' ? 'Partners only' : 'All listings'}
              <ChevronDown className="h-3 w-3 opacity-60" />
            </button>
            {openPill === 'source' && (
              <div className="absolute top-full mt-2 left-0 z-50 bg-white border border-gray-200 rounded-2xl shadow-xl py-2 min-w-[170px]">
                {([
                  { value: '',         label: 'All listings',   desc: 'Casa + partners' },
                  { value: 'casa',     label: 'Casa only',      desc: 'Managed by us' },
                  { value: 'external', label: 'Partners only',  desc: 'HousingAnywhere etc.' },
                ] as const).map((opt) => (
                  <button key={opt.value}
                    onClick={() => { handleFilterChange({ ...filters, source: opt.value }); setOpenPill(null); }}
                    className={`w-full text-left px-4 py-2.5 transition-colors ${filters.source === opt.value ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                  >
                    <span className={`text-sm block ${filters.source === opt.value ? 'text-blue-700 font-semibold' : 'text-gray-700'}`}>{opt.label}</span>
                    <span className="text-[11px] text-gray-400">{opt.desc}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sort */}
          <div className="relative ml-auto shrink-0">
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
              className="h-9 appearance-none rounded-full border border-gray-200 bg-white pl-3.5 pr-8 text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
            >
              {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Firestore warning (permission denied or other error) */}
        {listingsError && (
          <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-700">
            {listingsError === 'permission-denied'
              ? 'Live Casa listings unavailable (Firestore permission). Showing cached listings.'
              : `Could not load live listings: ${listingsError}. Showing cached listings.`}
          </div>
        )}

        {/* Result count */}
        <div className="flex items-center gap-3 mb-3 min-h-[20px]">
          {loading ? (
            <span className="text-sm text-gray-400 animate-pulse">Loading…</span>
          ) : (
            <span className="text-sm text-gray-600">
              <span className="font-semibold text-gray-900">{sorted.length}</span>{' '}
              {sorted.length === 1 ? 'property' : 'properties'}
              {filters.search && <span className="text-gray-400"> in <span className="text-gray-600 font-medium">{filters.search}</span></span>}
            </span>
          )}
          {haLoading && <span className="text-xs text-blue-500">Fetching partner listings…</span>}
        </div>

        {/* Split view: list (left, 58%) + map (right, sticky) */}
        <div className="flex flex-col lg:flex-row lg:items-start gap-3 lg:gap-4">

          {/* List — 2-column grid, paginated */}
          <div className="order-2 lg:order-1 w-full lg:w-[58%]">
            {listingsLoading && sorted.length === 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[1,2,3,4].map((i) => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    <div className="h-44 bg-gray-200 animate-pulse" />
                    <div className="p-3.5 space-y-2.5">
                      <div className="h-4 bg-gray-200 rounded-lg animate-pulse w-3/4" />
                      <div className="h-3 bg-gray-100 rounded-lg animate-pulse w-1/2" />
                      <div className="flex gap-3 pt-1">
                        <div className="h-3 bg-gray-100 rounded-lg animate-pulse w-14" />
                        <div className="h-3 bg-gray-100 rounded-lg animate-pulse w-14" />
                      </div>
                      <div className="flex justify-between items-center pt-2">
                        <div className="h-5 bg-gray-200 rounded-lg animate-pulse w-20" />
                        <div className="h-3 bg-gray-100 rounded-lg animate-pulse w-24" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : sorted.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
                <p className="text-gray-500 mb-2">No properties match your search</p>
                <p className="text-gray-400 text-sm mb-4">Try a different city or adjust the filters</p>
                <button onClick={handleClear} className="text-blue-600 text-sm hover:underline">Clear and start over</button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {sorted.slice(0, visibleCount).map((p) => (
                    <div
                      key={p.id}
                      onMouseEnter={() => setSelectedId(p.id)}
                      onMouseLeave={() => setSelectedId(null)}
                      className={`rounded-2xl transition-all duration-150 ${selectedId === p.id ? 'ring-2 ring-blue-500 shadow-lg' : ''}`}
                    >
                      <PropertyCard property={p} />
                    </div>
                  ))}
                </div>
                {/* Sentinel — IntersectionObserver loads next page when this enters view */}
                {sorted.length > visibleCount && (
                  <div ref={sentinelRef} className="flex justify-center py-6">
                    <span className="text-sm text-gray-400 animate-pulse">Loading more…</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Map — shows as soon as any properties are available; HA badge while partner listings load */}
          <div className="order-1 lg:order-2 lg:flex-1 rounded-xl overflow-hidden border border-gray-200 shadow-sm h-[300px] lg:h-[calc(100vh-130px)] lg:sticky lg:top-4 relative">
            {sorted.length > 0 ? (
              <>
                <PropertyMap properties={sorted} selectedId={selectedId} onSelect={setSelectedId} />
                {haLoading && (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-1.5 bg-white/90 backdrop-blur-sm border border-gray-100 rounded-full px-3 py-1.5 shadow text-xs text-gray-500 whitespace-nowrap pointer-events-none">
                    <Loader2 className="h-3 w-3 animate-spin text-blue-400" />
                    Loading partner listings…
                  </div>
                )}
              </>
            ) : (
              <div className="w-full h-full bg-gray-100 animate-pulse" />
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">Loading…</div>}>
      <SearchContent />
    </Suspense>
  );
}
