'use client';

import { useState, useCallback, useEffect, useRef, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams, useRouter } from 'next/navigation';
import { SlidersHorizontal, X, ChevronDown, Search } from 'lucide-react';
import { PropertyCard } from '@/components/unistay/PropertyCard';
import { FilterSidebar } from '@/components/unistay/FilterSidebar';
import { Breadcrumbs } from '@/components/unistay/ui/breadcrumbs';
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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedId,  setSelectedId]  = useState<string | null>(null);
  const [haListings,  setHaListings]  = useState<ExternalProperty[]>([]);
  const [haLoading,   setHaLoading]   = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { listings: firestoreListings, loading: listingsLoading } = useFirestoreListings();

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
    dateFrom: searchParams.get('from') || tomorrow(),
    dateTo:   searchParams.get('to')   || firstOfNextMonth(),
  }));

  const activeCount = countActiveFilters(filters);

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

  function handleFilterChange(f: FilterValues) { setFilters(f); syncUrl(f); fetchHA(f); }
  function handleSearchInput(v: string) { const n = { ...filters, search: v }; setFilters(n); syncUrl(n); fetchHA(n); }
  function handleClear() { setFilters(DEFAULT_FILTERS); setHaListings([]); router.replace('/unistay/search', { scroll: false }); }

  const sorted  = sortProperties(applyFilters([...firestoreListings, ...haListings], filters), sortBy);
  const loading = listingsLoading || haLoading;

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

        {/* Search bar row */}
        <div className="flex items-center gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleSearchInput(e.target.value)}
              placeholder="Search city, neighbourhood, or keyword…"
              className="w-full h-11 rounded-xl border border-gray-200 bg-white pl-10 pr-9 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            />
            {filters.search && (
              <button onClick={() => handleSearchInput('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <button
            onClick={() => setFiltersOpen((o) => !o)}
            className={`flex items-center gap-2 text-sm font-medium px-3 py-2.5 rounded-xl border transition-colors shrink-0 ${
              filtersOpen ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-200 hover:border-blue-400 shadow-sm'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">Filters</span>
            {activeCount > 0 && (
              <span className={`text-xs rounded-full w-4 h-4 flex items-center justify-center ${filtersOpen ? 'bg-white text-gray-900' : 'bg-blue-600 text-white'}`}>
                {activeCount}
              </span>
            )}
          </button>

          <div className="relative hidden sm:block shrink-0">
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2.5 text-sm border border-gray-200 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Filter dropdown panel */}
        {filtersOpen && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-4">
            <div className="p-5 max-h-72 overflow-y-auto">
              <FilterSidebar
                filters={filters}
                onChange={handleFilterChange}
                onClear={() => { handleClear(); setFiltersOpen(false); }}
                activeCount={activeCount}
              />
            </div>
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
            </span>
          )}
          {haLoading && <span className="text-xs text-blue-500">Fetching partner listings…</span>}
        </div>

        {/* Split view: list (left) + map (right, sticky) */}
        <div className="flex flex-col lg:flex-row lg:items-start gap-3 lg:gap-4">

          {/* List column */}
          <div className="order-2 lg:order-1 w-full lg:w-[44%] space-y-3">
            {loading && sorted.length === 0
              ? [1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-white rounded-xl border border-gray-200 h-52 animate-pulse" />
                ))
              : sorted.length === 0
              ? (
                <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
                  <p className="text-gray-500 mb-2">No properties match your search</p>
                  <p className="text-gray-400 text-sm mb-4">Try a different city or adjust the filters</p>
                  <button onClick={handleClear} className="text-blue-600 text-sm hover:underline">Clear and start over</button>
                </div>
              )
              : sorted.map((p) => (
                <div
                  key={p.id}
                  onMouseEnter={() => setSelectedId(p.id)}
                  onMouseLeave={() => setSelectedId(null)}
                  className={`rounded-xl transition-all duration-150 ${selectedId === p.id ? 'ring-2 ring-blue-500 shadow-lg' : ''}`}
                >
                  <PropertyCard property={p} />
                </div>
              ))
            }
          </div>

          {/* Map column — mobile: 300px above list; desktop: sticky, tall */}
          <div className="order-1 lg:order-2 lg:flex-1 rounded-xl overflow-hidden border border-gray-200 shadow-sm h-[300px] lg:h-[calc(100vh-130px)] lg:sticky lg:top-4">
            {!loading ? (
              <PropertyMap
                properties={sorted}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
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
