'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  collection, getDocs, doc, updateDoc, Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/unistay/firebase';
import {
  Search, X, ChevronRight, CheckCircle2, XCircle, Clock,
  Loader2, ChevronDown, Star, StarOff, MapPin, Bed,
  SquareArrowOutUpRight, DollarSign, Home,
} from 'lucide-react';

type ListingStatus = 'pending_review' | 'approved' | 'rejected';

interface AdminListing {
  id: string;
  title: string;
  type: string;
  city: string;
  address: string;
  price: number;
  bedrooms?: number;
  size?: number;
  availableFrom?: string;
  images?: string[];
  features?: string[];
  description?: string;
  featured?: boolean;
  status: ListingStatus;
  submittedBy?: string;
  submittedAt?: string;
  coldRent?: number;
  utilityEstimate?: number;
}

const STATUS_CFG: Record<ListingStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending_review: { label: 'Pending',  color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200',  icon: <Clock        className="h-3 w-3" /> },
  approved:       { label: 'Approved', color: 'text-green-700', bg: 'bg-green-50 border-green-200',  icon: <CheckCircle2 className="h-3 w-3" /> },
  rejected:       { label: 'Rejected', color: 'text-red-700',   bg: 'bg-red-50   border-red-200',    icon: <XCircle      className="h-3 w-3" /> },
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function fmtDate(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function toIso(val: unknown): string | undefined {
  if (!val) return undefined;
  if (val instanceof Timestamp) return val.toDate().toISOString();
  if (typeof val === 'string') return val;
  return undefined;
}

export default function AdminListingsPage() {
  const [listings, setListings]       = useState<AdminListing[]>([]);
  const [loading, setLoading]         = useState(true);
  const [fetchError, setFetchError]   = useState('');
  const [selected, setSelected]       = useState<AdminListing | null>(null);
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState<ListingStatus | 'all'>('all');
  const [updating, setUpdating]       = useState(false);

  useEffect(() => {
    setLoading(true);
    setFetchError('');
    getDocs(collection(db, 'listings')).then((snap) => {
      const list: AdminListing[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          title:           data.title       ?? '(Untitled)',
          type:            data.type        ?? 'apartment',
          city:            data.city        ?? '—',
          address:         data.address     ?? '—',
          price:           data.price       ?? 0,
          bedrooms:        data.bedrooms,
          size:            data.size,
          availableFrom:   data.availableFrom,
          images:          data.images      ?? (data.image ? [data.image] : []),
          features:        data.features    ?? [],
          description:     data.description ?? '',
          featured:        data.featured    ?? false,
          status:          data.status      ?? 'pending_review',
          submittedBy:     data.submittedBy,
          submittedAt:     toIso(data.submittedAt ?? data.createdAt),
          coldRent:        data.coldRent,
          utilityEstimate: data.utilityEstimate,
        } as AdminListing;
      });
      setListings(list.sort((a, b) => (b.submittedAt ?? '').localeCompare(a.submittedAt ?? '')));
    })
    .catch((err) => {
      const code: string = err?.code ?? '';
      if (code.includes('permission') || code.includes('unauthorized')) {
        setFetchError('Firestore permission denied. Update your security rules to allow reads when authenticated.');
      } else {
        setFetchError(`Could not load listings: ${code || err?.message || 'unknown error'}`);
      }
    })
    .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return listings.filter((l) => {
      if (statusFilter !== 'all' && l.status !== statusFilter) return false;
      if (!q) return true;
      return (l.title + l.city + l.address).toLowerCase().includes(q);
    });
  }, [listings, search, statusFilter]);

  async function setStatus(listing: AdminListing, status: ListingStatus) {
    setUpdating(true);
    try {
      await updateDoc(doc(db, 'listings', listing.id), { status });
      const updated = { ...listing, status };
      setListings((prev) => prev.map((l) => l.id === listing.id ? updated : l));
      setSelected(updated);
    } finally {
      setUpdating(false);
    }
  }

  async function toggleFeatured(listing: AdminListing) {
    setUpdating(true);
    try {
      const featured = !listing.featured;
      await updateDoc(doc(db, 'listings', listing.id), { featured });
      const updated = { ...listing, featured };
      setListings((prev) => prev.map((l) => l.id === listing.id ? updated : l));
      setSelected(updated);
    } finally {
      setUpdating(false);
    }
  }

  const stats = useMemo(() => ({
    total:    listings.length,
    pending:  listings.filter((l) => l.status === 'pending_review').length,
    approved: listings.filter((l) => l.status === 'approved').length,
    rejected: listings.filter((l) => l.status === 'rejected').length,
  }), [listings]);

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {([
          { label: 'Total',    value: stats.total,    color: 'text-gray-900' },
          { label: 'Pending',  value: stats.pending,  color: 'text-amber-600' },
          { label: 'Approved', value: stats.approved, color: 'text-green-600' },
          { label: 'Rejected', value: stats.rejected, color: 'text-red-500'  },
        ] as const).map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 px-5 py-4">
            <p className="text-xs text-gray-400 mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-6">
        {/* List */}
        <div className={`flex-1 min-w-0 transition-all ${selected ? 'lg:max-w-[55%]' : ''}`}>
          {/* Toolbar */}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by title, city, address…"
                className="w-full h-9 pl-9 pr-4 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="relative shrink-0">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as ListingStatus | 'all')}
                className="h-9 appearance-none pl-3 pr-8 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="all">All statuses</option>
                <option value="pending_review">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {loading ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
              <Loader2 className="h-5 w-5 animate-spin text-gray-300 mx-auto" />
            </div>
          ) : fetchError ? (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
              <XCircle className="h-8 w-8 text-red-300 mx-auto mb-3" />
              <p className="text-red-700 text-sm font-medium mb-1">Could not load listings</p>
              <p className="text-red-400 text-xs leading-relaxed max-w-sm mx-auto">{fetchError}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
              <Home className="h-8 w-8 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm font-medium">No listings found</p>
              <p className="text-gray-300 text-xs mt-1">
                {listings.length === 0
                  ? 'Listings submitted via the platform will appear here.'
                  : 'Try adjusting your filters.'}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Listing</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell">Price</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Submitted</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((l) => {
                    const cfg = STATUS_CFG[l.status];
                    const isActive = selected?.id === l.id;
                    const thumb = l.images?.[0];
                    return (
                      <tr
                        key={l.id}
                        onClick={() => setSelected(isActive ? null : l)}
                        className={`cursor-pointer transition-colors ${isActive ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            {thumb ? (
                              <img src={thumb} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0 bg-gray-100" />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                                <Home className="h-4 w-4 text-gray-300" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-medium text-gray-800 truncate">
                                {l.title}
                                {l.featured && <Star className="inline h-3 w-3 text-amber-400 fill-amber-400 ml-1.5 align-middle" />}
                              </p>
                              <p className="text-xs text-gray-400 truncate flex items-center gap-1">
                                <MapPin className="h-2.5 w-2.5 shrink-0" />{l.city}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3.5 hidden sm:table-cell">
                          <span className="text-gray-700 font-medium">€{l.price}</span>
                          <span className="text-gray-400 text-xs">/mo</span>
                        </td>
                        <td className="px-3 py-3.5">
                          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${cfg.color} ${cfg.bg}`}>
                            {cfg.icon}{cfg.label}
                          </span>
                        </td>
                        <td className="px-3 py-3.5 text-xs text-gray-400 hidden md:table-cell">
                          {fmtDate(l.submittedAt)}
                        </td>
                        <td className="px-3 py-3.5">
                          <ChevronRight className={`h-4 w-4 transition-transform text-gray-300 ${isActive ? 'rotate-90' : ''}`} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="hidden lg:block w-[42%] shrink-0">
            <div className="bg-white rounded-2xl border border-gray-200 sticky top-6 overflow-hidden max-h-[calc(100vh-8rem)] flex flex-col">
              {/* Image */}
              {selected.images?.[0] && (
                <div className="w-full h-44 shrink-0 bg-gray-100">
                  <img src={selected.images[0]} alt={selected.title} className="w-full h-full object-cover" />
                </div>
              )}

              {/* Panel header */}
              <div className="flex items-start justify-between p-5 border-b border-gray-100 shrink-0">
                <div className="min-w-0 pr-2">
                  <p className="font-semibold text-gray-900 truncate">{selected.title}</p>
                  <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3 shrink-0" />{selected.address}, {selected.city}
                  </p>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Scrollable body */}
              <div className="overflow-y-auto flex-1 p-5 space-y-5">
                {/* Quick stats */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: DollarSign, label: 'Warmmiete', value: `€${selected.price}/mo` },
                    { icon: Home,       label: 'Type',      value: selected.type },
                    ...(selected.bedrooms !== undefined ? [{ icon: Bed,     label: 'Bedrooms', value: String(selected.bedrooms) }] : []),
                    ...(selected.size     !== undefined ? [{ icon: SquareArrowOutUpRight, label: 'Size', value: `${selected.size} m²` }] : []),
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="bg-gray-50 rounded-xl px-3 py-2.5">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
                      <div className="flex items-center gap-1.5">
                        <Icon className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                        <span className="text-sm font-medium text-gray-700">{value}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Cost breakdown */}
                {selected.coldRent !== undefined && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Cost breakdown</p>
                    <div className="rounded-xl border border-gray-200 divide-y divide-gray-100 text-sm overflow-hidden">
                      <div className="flex justify-between px-3 py-2">
                        <span className="text-gray-500">Kaltmiete</span>
                        <span className="font-medium text-gray-700">€{selected.coldRent}/mo</span>
                      </div>
                      {selected.utilityEstimate !== undefined && (
                        <div className="flex justify-between px-3 py-2">
                          <span className="text-gray-500">Nebenkosten</span>
                          <span className="font-medium text-gray-700">~€{selected.utilityEstimate}/mo</span>
                        </div>
                      )}
                      <div className="flex justify-between px-3 py-2 bg-gray-50">
                        <span className="font-semibold text-gray-700">Warmmiete</span>
                        <span className="font-bold text-gray-900">€{selected.price}/mo</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Availability */}
                {selected.availableFrom && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Availability</p>
                    <p className="text-sm text-gray-700">From {fmtDate(selected.availableFrom)}</p>
                  </div>
                )}

                {/* Features */}
                {selected.features && selected.features.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Features</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selected.features.map((f) => (
                        <span key={f} className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">{f}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Description */}
                {selected.description && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Description</p>
                    <p className="text-xs text-gray-600 leading-relaxed">{selected.description}</p>
                  </div>
                )}

                {/* Submitter */}
                {selected.submittedBy && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Submitted by</p>
                    <p className="text-sm text-gray-700">{selected.submittedBy}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{fmtDate(selected.submittedAt)}</p>
                  </div>
                )}
              </div>

              {/* Action footer */}
              <div className="p-5 border-t border-gray-100 shrink-0 space-y-3">
                {/* Feature toggle */}
                <button
                  onClick={() => toggleFeatured(selected)}
                  disabled={updating}
                  className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold border transition-colors disabled:opacity-50 ${
                    selected.featured
                      ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
                      : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {selected.featured
                    ? <><StarOff className="h-3.5 w-3.5" /> Remove featured</>
                    : <><Star    className="h-3.5 w-3.5" /> Mark as featured</>}
                </button>

                {/* Status buttons */}
                <div>
                  <p className="text-xs text-gray-400 mb-2">Listing status</p>
                  <div className="flex gap-2">
                    {(['approved', 'pending_review', 'rejected'] as ListingStatus[]).map((s) => {
                      const cfg = STATUS_CFG[s];
                      const isActive = selected.status === s;
                      return (
                        <button
                          key={s}
                          onClick={() => setStatus(selected, s)}
                          disabled={updating || isActive}
                          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border transition-colors disabled:cursor-default ${
                            isActive
                              ? `${cfg.color} ${cfg.bg} border-current`
                              : 'border-gray-200 text-gray-400 hover:border-gray-300 bg-white'
                          }`}
                        >
                          {updating && isActive ? <Loader2 className="h-3 w-3 animate-spin" /> : cfg.icon}
                          {cfg.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
