'use client';

import { useState, useCallback, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { SlidersHorizontal, X, ChevronDown } from 'lucide-react';
import { PropertyCard } from '@/components/unistay/PropertyCard';
import { FilterSidebar } from '@/components/unistay/FilterSidebar';
import { Breadcrumbs } from '@/components/unistay/ui/breadcrumbs';
import { useFirestoreListings } from '@/lib/unistay/useFirestoreListings';
import type { ExternalProperty, FilterValues, Property } from '@/lib/unistay/types';

const DEFAULT_FILTERS: FilterValues = {
  search: '',
  type: '',
  city: '',
  minPrice: 0,
  maxPrice: 3000,
  bedrooms: 'all',
  features: [],
  dateFrom: '',
  dateTo: '',
};

const SORT_OPTIONS = [
  { value: 'featured', label: 'Featured first' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'newest', label: 'Available soonest' },
];

type SourceTab = 'all' | 'casa' | 'housinganywhere';

function applyFilters(properties: Property[], filters: FilterValues): Property[] {
  return properties.filter((p) => {
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (!p.title.toLowerCase().includes(q) && !p.city.toLowerCase().includes(q)) return false;
    }
    if (filters.type && p.type !== filters.type) return false;
    if (filters.city && p.city.toLowerCase() !== filters.city.toLowerCase()) return false;
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
      case 'price-asc': return a.price - b.price;
      case 'price-desc': return b.price - a.price;
      case 'newest':
        return new Date(a.availableFrom).getTime() - new Date(b.availableFrom).getTime();
      default: {
        const aFeatured = a.source === 'casa' && (a as { featured?: boolean }).featured ? 1 : 0;
        const bFeatured = b.source === 'casa' && (b as { featured?: boolean }).featured ? 1 : 0;
        return bFeatured - aFeatured;
      }
    }
  });
}

function countActiveFilters(filters: FilterValues): number {
  let count = 0;
  if (filters.type) count++;
  if (filters.city) count++;
  if (filters.minPrice > 0 || filters.maxPrice < 3000) count++;
  if (filters.bedrooms && filters.bedrooms !== 'all') count++;
  if (filters.features.length) count += filters.features.length;
  if (filters.dateFrom) count++;
  if (filters.dateTo) count++;
  return count;
}

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sortBy, setSortBy] = useState('featured');
  const [sourceTab, setSourceTab] = useState<SourceTab>('all');
  const [haListings, setHaListings] = useState<ExternalProperty[]>([]);
  const [haLoading, setHaLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch approved listings from Firestore (includes seeded Casa properties + user submissions)
  const { listings: firestoreListings, loading: listingsLoading } = useFirestoreListings();

  const [filters, setFilters] = useState<FilterValues>(() => ({
    ...DEFAULT_FILTERS,
    type: searchParams.get('type') ?? '',
    city: searchParams.get('city') ?? '',
    minPrice: Number(searchParams.get('minPrice') ?? 0),
    maxPrice: Number(searchParams.get('maxPrice') ?? 3000),
    bedrooms: searchParams.get('bedrooms') ?? 'all',
    features: searchParams.get('features')?.split(',').filter(Boolean) ?? [],
    dateFrom: searchParams.get('from') ?? '',
    dateTo: searchParams.get('to') ?? '',
  }));

  // Fetch live HousingAnywhere listings from our API route
  const fetchHA = useCallback((f: FilterValues) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setHaLoading(true);
      try {
        const params = new URLSearchParams();
        if (f.city) params.set('city', f.city);
        if (f.type) params.set('type', f.type);
        if (f.minPrice > 0) params.set('minPrice', String(f.minPrice));
        if (f.maxPrice < 3000) params.set('maxPrice', String(f.maxPrice));
        if (f.bedrooms && f.bedrooms !== 'all') params.set('bedrooms', f.bedrooms);
        const res = await fetch(`/api/unistay/listings?${params}`);
        if (res.ok) setHaListings(await res.json());
      } finally {
        setHaLoading(false);
      }
    }, 300);
  }, []);

  useEffect(() => { fetchHA(filters); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync filters to URL
  const syncUrl = useCallback((f: FilterValues) => {
    const params = new URLSearchParams();
    if (f.type) params.set('type', f.type);
    if (f.city) params.set('city', f.city);
    if (f.minPrice > 0) params.set('minPrice', String(f.minPrice));
    if (f.maxPrice < 3000) params.set('maxPrice', String(f.maxPrice));
    if (f.bedrooms && f.bedrooms !== 'all') params.set('bedrooms', f.bedrooms);
    if (f.features.length) params.set('features', f.features.join(','));
    if (f.dateFrom) params.set('from', f.dateFrom);
    if (f.dateTo) params.set('to', f.dateTo);
    router.replace(`/unistay/search?${params.toString()}`, { scroll: false });
  }, [router]);

  function handleFilterChange(f: FilterValues) {
    setFilters(f);
    syncUrl(f);
    fetchHA(f);
  }

  function handleClear() {
    setFilters(DEFAULT_FILTERS);
    router.replace('/unistay/search', { scroll: false });
    fetchHA(DEFAULT_FILTERS);
  }

  // Use Firestore listings as the Casa pool; fall back to empty while loading
  const casaPool: Property[] = firestoreListings;
  const allPool: Property[] = [...casaPool, ...haListings];

  const sourcePool =
    sourceTab === 'casa' ? casaPool :
    sourceTab === 'housinganywhere' ? haListings :
    allPool;

  const filtered = applyFilters(sourcePool, filters);
  const sorted = sortProperties(filtered, sortBy);
  const activeCount = countActiveFilters(filters);

  const casaCount = applyFilters(casaPool, filters).length;
  const externalCount = applyFilters(haListings, filters).length;
  const totalCount = casaCount + externalCount;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 transition-colors"
          >
            <ChevronDown className="h-4 w-4 rotate-90" />
            Back
          </button>
          <Breadcrumbs crumbs={[{ label: 'Home', href: '/' }, { label: 'UniStay', href: '/unistay/browse' }, { label: 'Search results' }]} className="" />
        </div>
        {/* Source Tabs */}
        <div className="flex items-center gap-1 mb-6 bg-white rounded-xl p-1 border border-gray-200 w-fit">
          {(
            [
              { key: 'all', label: `All (${totalCount})` },
              { key: 'casa', label: `Casa Managed (${casaCount})` },
              { key: 'housinganywhere', label: `HousingAnywhere (${externalCount})` },
            ] as { key: SourceTab; label: string }[]
          ).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSourceTab(key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                sourceTab === key
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex gap-6">
          {/* Desktop Sidebar */}
          <div className="hidden lg:block w-72 shrink-0">
            <div className="bg-white rounded-xl border border-gray-200 p-5 sticky top-24">
              <FilterSidebar
                filters={filters}
                onChange={handleFilterChange}
                onClear={handleClear}
                activeCount={activeCount}
              />
            </div>
          </div>

          {/* Results */}
          <div className="flex-1 min-w-0">
            {/* Results bar */}
            <div className="flex items-center justify-between mb-4 gap-3">
              {/* Mobile filter toggle */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden flex items-center gap-2 text-sm font-medium border border-gray-300 rounded-lg px-3 py-2 bg-white hover:border-blue-400"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filters {activeCount > 0 && <span className="bg-blue-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{activeCount}</span>}
              </button>

              <p className="text-sm text-gray-600">
                <span className="font-semibold text-gray-900">{sorted.length}</span> {sorted.length === 1 ? 'property' : 'properties'}
              </p>

              {/* Sort */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Grid */}
            {listingsLoading || haLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="bg-white rounded-xl border border-gray-200 h-64 animate-pulse" />
                ))}
              </div>
            ) : sorted.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <p className="text-gray-500 text-lg mb-2">No properties match your filters</p>
                <p className="text-gray-400 text-sm mb-4">Try adjusting your search criteria</p>
                <button onClick={handleClear} className="text-blue-600 text-sm hover:underline">Clear all filters</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {sorted.map((p) => (
                  <PropertyCard key={p.id} property={p} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-80 bg-white shadow-xl overflow-y-auto p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900 text-lg">Filters</h2>
              <button onClick={() => setSidebarOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <FilterSidebar
              filters={filters}
              onChange={(f) => { handleFilterChange(f); }}
              onClear={() => { handleClear(); setSidebarOpen(false); }}
              activeCount={activeCount}
            />
            <div className="pt-4 mt-4 border-t">
              <button
                onClick={() => setSidebarOpen(false)}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Show {sorted.length} {sorted.length === 1 ? 'property' : 'properties'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">Loading...</div>}>
      <SearchContent />
    </Suspense>
  );
}
