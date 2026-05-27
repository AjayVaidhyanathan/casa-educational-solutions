'use client';

import { useState, useCallback, useEffect, useRef, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  SlidersHorizontal, X, ChevronDown, Search, MapPin,
  LayoutGrid, Map,
} from 'lucide-react';
import { PropertyCard } from '@/components/unistay/PropertyCard';
import { FilterSidebar } from '@/components/unistay/FilterSidebar';
import { Breadcrumbs } from '@/components/unistay/ui/breadcrumbs';
import { CitySearchInput } from '@/components/unistay/ui/city-search-input';
import { useFirestoreListings } from '@/lib/unistay/useFirestoreListings';
import type { ExternalProperty, FilterValues, Property } from '@/lib/unistay/types';

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
};

const SORT_OPTIONS = [
  { value: 'featured',   label: 'Featured first' },
  { value: 'price-asc',  label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'newest',     label: 'Available soonest' },
];


type SourceTab  = 'all' | 'casa' | 'housinganywhere';
type ViewMode   = 'list' | 'map';

/* ── Fuzzy helpers ────────────────────────────────────────────────────────── */
function fuzzyIncludes(query: string, target: string): boolean {
  const words = query.toLowerCase().trim().split(/\s+/);
  const t = target.toLowerCase();
  return words.every((word) => {
    if (!word) return true;
    if (t.includes(word)) return true;
    let qi = 0;
    for (const ch of t) {
      if (ch === word[qi]) qi++;
      if (qi === word.length) return true;
    }
    return false;
  });
}

function applyFilters(properties: Property[], filters: FilterValues): Property[] {
  return properties.filter((p) => {
    if (filters.search) {
      if (!fuzzyIncludes(filters.search, `${p.title} ${p.city} ${p.address ?? ''}`)) return false;
    }
    if (filters.type && p.type !== filters.type) return false;
    if (filters.city) {
      const fc = filters.city.toLowerCase();
      const pc = p.city.toLowerCase();
      if (!pc.includes(fc) && !fc.includes(pc)) return false;
    }
    if (p.price < filters.minPrice || p.price > filters.maxPrice) return false;
    if (filters.bedrooms && filters.bedrooms !== 'all') {
      const n = parseInt(filters.bedrooms);
      if (n === 3 ? p.bedrooms < 3 : p.bedrooms !== n) return false;
    }
    if (filters.features.length > 0) {
      if (!filters.features.every((f) => p.features.includes(f))) return false;
    }
    return true;
  });
}

function sortProperties(properties: Property[], sortBy: string): Property[] {
  return [...properties].sort((a, b) => {
    switch (sortBy) {
      case 'price-asc':  return a.price - b.price;
      case 'price-desc': return b.price - a.price;
      case 'newest':     return new Date(a.availableFrom).getTime() - new Date(b.availableFrom).getTime();
      default: {
        const af = a.source === 'casa' && (a as { featured?: boolean }).featured ? 1 : 0;
        const bf = b.source === 'casa' && (b as { featured?: boolean }).featured ? 1 : 0;
        return bf - af;
      }
    }
  });
}

function countActiveFilters(filters: FilterValues): number {
  let n = 0;
  if (filters.type) n++;
  if (filters.minPrice > 0 || filters.maxPrice < 3000) n++;
  if (filters.bedrooms && filters.bedrooms !== 'all') n++;
  if (filters.features.length) n += filters.features.length;
  if (filters.dateFrom) n++;
  if (filters.dateTo) n++;
  return n;
}

/* ── Main component ───────────────────────────────────────────────────────── */
function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [sortBy,      setSortBy]      = useState('featured');
  const [sourceTab,   setSourceTab]   = useState<SourceTab>('all');
  const [viewMode,    setViewMode]    = useState<ViewMode>('list');
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [haListings,  setHaListings]  = useState<ExternalProperty[]>([]);
  const [haLoading,   setHaLoading]   = useState(false);
  const [cities,      setCities]      = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { listings: firestoreListings, loading: listingsLoading } = useFirestoreListings();

  const [filters, setFilters] = useState<FilterValues>(() => ({
    ...DEFAULT_FILTERS,
    type:     searchParams.get('type') ?? '',
    city:     searchParams.get('city') ?? '',
    search:   searchParams.get('q')    ?? '',
    minPrice: Number(searchParams.get('minPrice') ?? 0),
    maxPrice: Number(searchParams.get('maxPrice') ?? 3000),
    bedrooms: searchParams.get('bedrooms') ?? 'all',
    features: searchParams.get('features')?.split(',').filter(Boolean) ?? [],
    // Pre-fill dates: tomorrow → first of next month (override with URL params if present)
    dateFrom: searchParams.get('from') || tomorrow(),
    dateTo:   searchParams.get('to')   || firstOfNextMonth(),
  }));

  const hasSearch = !!(filters.city || filters.search);
  const activeCount = countActiveFilters(filters);

  // Fetch city list for empty-state combobox
  useEffect(() => {
    fetch('/api/unistay/cities')
      .then((r) => r.json())
      .then((data: string[]) => setCities(data)) // eslint-disable-line react-hooks/set-state-in-effect
      .catch(() => {});
  }, []);

  const fetchHA = useCallback((f: FilterValues) => {
    if (!f.city && !f.search) { setHaListings([]); setHaLoading(false); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setHaLoading(true);
      try {
        const p = new URLSearchParams();
        if (f.city)   p.set('city', f.city);
        if (f.type)   p.set('type', f.type);
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

  useEffect(() => { if (hasSearch) fetchHA(filters); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const syncUrl = useCallback((f: FilterValues) => {
    const p = new URLSearchParams();
    if (f.type)   p.set('type', f.type);
    if (f.city)   p.set('city', f.city);
    if (f.search) p.set('q',    f.search);
    if (f.minPrice > 0)    p.set('minPrice', String(f.minPrice));
    if (f.maxPrice < 3000) p.set('maxPrice', String(f.maxPrice));
    if (f.bedrooms && f.bedrooms !== 'all') p.set('bedrooms', f.bedrooms);
    if (f.features.length) p.set('features', f.features.join(','));
    if (f.dateFrom) p.set('from', f.dateFrom);
    if (f.dateTo)   p.set('to',   f.dateTo);
    router.replace(`/unistay/search?${p.toString()}`, { scroll: false });
  }, [router]);

  function handleFilterChange(f: FilterValues) { setFilters(f); syncUrl(f); fetchHA(f); }
  function handleSearchInput(value: string)    { const n = { ...filters, search: value }; setFilters(n); syncUrl(n); fetchHA(n); }
  function handleCitySelect(city: string)      { const n = { ...filters, city };          setFilters(n); syncUrl(n); fetchHA(n); }
  function handleClear() { setFilters(DEFAULT_FILTERS); setHaListings([]); router.replace('/unistay/search', { scroll: false }); }

  const casaPool: Property[]  = firestoreListings;
  const allPool:  Property[]  = [...casaPool, ...haListings];
  const sourcePool = sourceTab === 'casa' ? casaPool : sourceTab === 'housinganywhere' ? haListings : allPool;
  const filtered   = applyFilters(sourcePool, filters);
  const sorted     = sortProperties(filtered, sortBy);
  const casaCount     = applyFilters(casaPool,    filters).length;
  const externalCount = applyFilters(haListings,  filters).length;
  const totalCount    = casaCount + externalCount;

  /* ── Nav strip (shared) ──────────────────────────────────────────────────── */
  const nav = (
    <div className="flex items-center gap-4 mb-6">
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 transition-colors shrink-0">
        <ChevronDown className="h-4 w-4 rotate-90" /> Back
      </button>
      <Breadcrumbs crumbs={[{ label: 'Home', href: '/' }, { label: 'UniStay', href: '/unistay/browse' }, { label: 'Search results' }]} className="" />
    </div>
  );

  /* ── Empty / pre-search state ────────────────────────────────────────────── */
  if (!hasSearch) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 pt-8 pb-6">{nav}</div>

        <div className="flex items-center justify-center px-4 pb-20" style={{ minHeight: 'calc(100vh - 180px)' }}>
          <div className="w-full max-w-md text-center">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <MapPin className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Find your student home</h1>
            <p className="text-gray-500 text-sm mb-8">Search thousands of properties across Germany.</p>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-5 space-y-4 text-left mb-6">
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5 block">City</label>
                <CitySearchInput cities={cities} value={filters.city} onChange={handleCitySelect} placeholder="Search city…" />
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-xs text-gray-300 uppercase tracking-widest">or</span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5 block">Keyword search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => handleSearchInput(e.target.value)}
                    placeholder="e.g. furnished studio near university…"
                    className="w-full h-11 rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-4 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  }

  /* ── Results state ───────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        {nav}

        {/* Search bar + chips + view controls */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {/* Text search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleSearchInput(e.target.value)}
              placeholder="Search by title, keyword, neighbourhood…"
              className="w-full h-11 rounded-xl border border-gray-200 bg-white pl-10 pr-8 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            />
            {filters.search && (
              <button onClick={() => handleSearchInput('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* City chip */}
          {filters.city && (
            <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full pl-3 pr-2 py-1.5 text-sm font-medium">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              {filters.city}
              <button onClick={() => handleFilterChange({ ...filters, city: '' })} className="hover:bg-blue-100 rounded-full p-0.5 transition-colors">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {/* Filters toggle */}
          <button
            onClick={() => setFiltersOpen((o) => !o)}
            className={`hidden lg:flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg border transition-colors ${filtersOpen ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'}`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {activeCount > 0 && (
              <span className={`text-xs rounded-full w-4 h-4 flex items-center justify-center ${filtersOpen ? 'bg-white text-gray-900' : 'bg-blue-600 text-white'}`}>
                {activeCount}
              </span>
            )}
          </button>

          {/* List / Map toggle */}
          <div className="flex gap-0.5 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              title="List view"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline">List</span>
            </button>
            <button
              onClick={() => setViewMode('map')}
              title="Map view"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'map' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Map className="h-4 w-4" />
              <span className="hidden sm:inline">Map</span>
            </button>
          </div>

          {/* Sort (list view only) */}
          {viewMode === 'list' && (
            <div className="relative">
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer">
                {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          )}
        </div>

        {/* Source tabs */}
        <div className="flex items-center gap-1 mb-5 bg-white rounded-xl p-1 border border-gray-200 w-fit">
          {([
            { key: 'all',             label: `All (${totalCount})` },
            { key: 'casa',            label: `Casa Managed (${casaCount})` },
            { key: 'housinganywhere', label: `HousingAnywhere (${externalCount})` },
          ] as { key: SourceTab; label: string }[]).map(({ key, label }) => (
            <button key={key} onClick={() => setSourceTab(key)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${sourceTab === key ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Content area */}
        <div className="flex gap-6">

          {/* Collapsible sidebar — desktop only */}
          {filtersOpen && (
            <div className="hidden lg:block w-72 shrink-0 transition-all">
              <div className="bg-white rounded-xl border border-gray-200 p-5 sticky top-24">
                <FilterSidebar filters={filters} onChange={handleFilterChange} onClear={handleClear} activeCount={activeCount} />
              </div>
            </div>
          )}

          {/* Results */}
          <div className="flex-1 min-w-0">

            {/* Mobile filter toggle */}
            <div className="flex items-center justify-between mb-4 lg:hidden">
              <button
                onClick={() => setFiltersOpen((o) => !o)}
                className="flex items-center gap-2 text-sm font-medium border border-gray-300 rounded-lg px-3 py-2 bg-white hover:border-blue-400"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filters {activeCount > 0 && <span className="bg-blue-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{activeCount}</span>}
              </button>
              <p className="text-sm text-gray-600">
                <span className="font-semibold text-gray-900">{sorted.length}</span> {sorted.length === 1 ? 'property' : 'properties'}
              </p>
            </div>

            {/* Result count — desktop */}
            <p className="hidden lg:block text-sm text-gray-600 mb-4">
              <span className="font-semibold text-gray-900">{sorted.length}</span> {sorted.length === 1 ? 'property' : 'properties'}
            </p>

            {/* Map view */}
            {viewMode === 'map' ? (
              <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm" style={{ height: 560 }}>
                {listingsLoading || haLoading ? (
                  <div className="w-full h-full bg-gray-100 animate-pulse rounded-xl" />
                ) : (
                  <PropertyMap
                    properties={sorted}
                    selectedCity={filters.city}
                    onCitySelect={(city) => handleFilterChange({ ...filters, city })}
                  />
                )}
              </div>
            ) : listingsLoading || haLoading ? (
              /* List skeleton */
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="bg-white rounded-xl border border-gray-200 h-64 animate-pulse" />
                ))}
              </div>
            ) : sorted.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <p className="text-gray-500 text-lg mb-2">No properties match your search</p>
                <p className="text-gray-400 text-sm mb-4">Try different keywords, a different city, or adjust the filters</p>
                <button onClick={handleClear} className="text-blue-600 text-sm hover:underline">Clear and start over</button>
              </div>
            ) : (
              /* List grid */
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {sorted.map((p) => <PropertyCard key={p.id} property={p} />)}
              </div>
            )}
          </div>
        </div>

        {/* Mobile filter drawer */}
        {filtersOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setFiltersOpen(false)} />
            <div className="absolute right-0 top-0 h-full w-80 bg-white shadow-xl overflow-y-auto p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900 text-lg">Filters</h2>
                <button onClick={() => setFiltersOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
              </div>
              <FilterSidebar filters={filters} onChange={(f) => { handleFilterChange(f); }} onClear={() => { handleClear(); setFiltersOpen(false); }} activeCount={activeCount} />
              <div className="pt-4 mt-4 border-t">
                <button onClick={() => setFiltersOpen(false)} className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                  Show {sorted.length} {sorted.length === 1 ? 'property' : 'properties'}
                </button>
              </div>
            </div>
          </div>
        )}
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
