'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  collection, getDocs, doc, updateDoc, query, orderBy,
} from 'firebase/firestore';
import { db } from '@/lib/unistay/firebase';
import {
  Search, X, CheckCircle2, XCircle, Clock, Loader2,
  ChevronDown, Building2, Mail, Phone, MapPin, Calendar,
  Video, Users, Home,
} from 'lucide-react';
import type { LandlordStatus, LandlordApplication } from '@/lib/unistay/types';

type FilterStatus = LandlordStatus | 'all';

const STATUS_CFG: Record<LandlordStatus, {
  label: string; color: string; bg: string; icon: React.ReactNode
}> = {
  none:     { label: 'None',     color: 'text-gray-500',   bg: 'bg-gray-50  border-gray-200',  icon: null },
  pending:  { label: 'Pending',  color: 'text-amber-700',  bg: 'bg-amber-50 border-amber-200', icon: <Clock        className="h-3 w-3" /> },
  approved: { label: 'Approved', color: 'text-green-700',  bg: 'bg-green-50 border-green-200', icon: <CheckCircle2 className="h-3 w-3" /> },
  rejected: { label: 'Rejected', color: 'text-red-700',    bg: 'bg-red-50   border-red-200',   icon: <XCircle      className="h-3 w-3" /> },
};

const TIME_LABELS: Record<string, string> = {
  morning:   'Morning (9:00–12:00)',
  afternoon: 'Afternoon (12:00–17:00)',
  evening:   'Evening (17:00–20:00)',
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function fmtDate(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function initials(name: string, email: string) {
  const src = name?.trim() || email;
  const parts = src.split(/[\s@]/);
  return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : src.slice(0, 2).toUpperCase();
}

export default function AdminLandlordsPage() {
  const [applications, setApplications] = useState<LandlordApplication[]>([]);
  const [loading,      setLoading]       = useState(true);
  const [fetchError,   setFetchError]    = useState('');
  const [selected,     setSelected]      = useState<LandlordApplication | null>(null);
  const [search,       setSearch]        = useState('');
  const [statusFilter, setStatusFilter]  = useState<FilterStatus>('all');
  const [updating,     setUpdating]      = useState(false);

  useEffect(() => {
    setLoading(true);
    setFetchError('');
    getDocs(query(collection(db, 'landlordApplications'), orderBy('appliedAt', 'desc')))
      .then((snap) => {
        setApplications(snap.docs.map((d) => ({ ...d.data() } as LandlordApplication)));
      })
      .catch((err) => {
        const code: string = err?.code ?? '';
        if (code.includes('permission') || code.includes('unauthorized')) {
          setFetchError('Firestore permission denied. Update security rules to allow admin reads on landlordApplications.');
        } else {
          setFetchError(`Could not load applications: ${code || err?.message || 'unknown'}`);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return applications.filter((a) => {
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      if (!q) return true;
      return (a.name + a.email + a.cities).toLowerCase().includes(q);
    });
  }, [applications, search, statusFilter]);

  const stats = useMemo(() => ({
    total:    applications.length,
    pending:  applications.filter((a) => a.status === 'pending').length,
    approved: applications.filter((a) => a.status === 'approved').length,
    rejected: applications.filter((a) => a.status === 'rejected').length,
  }), [applications]);

  async function setStatus(app: LandlordApplication, status: LandlordStatus) {
    setUpdating(true);
    try {
      await updateDoc(doc(db, 'landlordApplications', app.uid), { status });
      await updateDoc(doc(db, 'users', app.uid), { landlordStatus: status });
      const updated = { ...app, status };
      setApplications((prev) => prev.map((a) => a.uid === app.uid ? updated : a));
      setSelected(updated);
    } finally {
      setUpdating(false);
    }
  }

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {([
          { label: 'Total',    value: stats.total,    color: 'text-gray-900'  },
          { label: 'Pending',  value: stats.pending,  color: 'text-amber-600' },
          { label: 'Approved', value: stats.approved, color: 'text-green-600' },
          { label: 'Rejected', value: stats.rejected, color: 'text-red-500'   },
        ] as const).map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 px-5 py-4">
            <p className="text-xs text-gray-400 mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, city…"
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
            onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}
            className="h-9 appearance-none pl-3 pr-8 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
        </div>
      </div>

      <div className="flex gap-6">
        {/* Card grid */}
        <div className={`flex-1 min-w-0 transition-all ${selected ? 'lg:max-w-[55%]' : ''}`}>
          {loading ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
              <Loader2 className="h-5 w-5 animate-spin text-gray-300 mx-auto" />
            </div>
          ) : fetchError ? (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
              <XCircle className="h-8 w-8 text-red-300 mx-auto mb-3" />
              <p className="text-red-700 text-sm font-medium mb-1">Could not load applications</p>
              <p className="text-red-400 text-xs max-w-sm mx-auto">{fetchError}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
              <Building2 className="h-8 w-8 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm font-medium">No landlord applications found</p>
              <p className="text-gray-300 text-xs mt-1">
                {applications.length === 0 ? 'Applications will appear here.' : 'Try adjusting your filters.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((a) => {
                const cfg = STATUS_CFG[a.status as LandlordStatus] ?? STATUS_CFG.pending;
                const isActive = selected?.uid === a.uid;
                return (
                  <button
                    key={a.uid}
                    onClick={() => setSelected(isActive ? null : a)}
                    className={`text-left w-full bg-white rounded-2xl border p-4 transition-all hover:shadow-md ${
                      isActive ? 'border-blue-400 ring-2 ring-blue-200 shadow-md' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {/* Avatar + status */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                          <span className="text-blue-600 text-sm font-bold">{initials(a.name, a.email)}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-800 truncate text-sm">{a.name || '—'}</p>
                          <p className="text-xs text-gray-400 truncate">{a.email}</p>
                        </div>
                      </div>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ml-2 ${cfg.color} ${cfg.bg}`}>
                        {cfg.icon}{cfg.label}
                      </span>
                    </div>

                    {/* Details */}
                    <div className="space-y-1.5">
                      {a.cities && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <MapPin className="h-3 w-3 text-gray-300 shrink-0" />
                          <span className="truncate">{a.cities}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Home className="h-3 w-3 text-gray-300 shrink-0" />
                        <span>{a.propertiesCount} {parseInt(a.propertiesCount) === 1 ? 'property' : 'properties'}</span>
                        {a.landlordType && (
                          <span className="text-gray-300">· {a.landlordType === 'private' ? 'Private' : 'Manager'}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Video className="h-3 w-3 text-gray-300 shrink-0" />
                        <span>{fmtDate(a.videoCallDate)} — {TIME_LABELS[a.videoCallTime] ?? a.videoCallTime}</span>
                      </div>
                    </div>

                    <p className="text-[10px] text-gray-300 mt-3">Applied {fmtDate(a.appliedAt)}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="hidden lg:block w-[40%] shrink-0">
            <div className="bg-white rounded-2xl border border-gray-200 sticky top-6 overflow-hidden max-h-[calc(100vh-8rem)] flex flex-col">
              {/* Header */}
              <div className="flex items-start justify-between p-5 border-b border-gray-100 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-blue-600 font-bold">{initials(selected.name, selected.email)}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{selected.name || '—'}</p>
                    <p className="text-xs text-gray-400">Applied {fmtDate(selected.appliedAt)}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Body */}
              <div className="overflow-y-auto flex-1 p-5 space-y-6">

                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Contact</p>
                  <div className="space-y-2">
                    {[
                      { icon: Mail,  label: 'Email',   value: selected.email },
                      { icon: Phone, label: 'Phone',   value: selected.phone },
                      { icon: MapPin,label: 'Country', value: selected.country },
                    ].filter(({ value }) => value).map(({ icon: Icon, label, value }) => (
                      <div key={label} className="flex items-center gap-3 text-sm">
                        <Icon className="h-3.5 w-3.5 text-gray-300 shrink-0" />
                        <span className="text-gray-400 w-16 shrink-0 text-xs">{label}</span>
                        <span className="text-gray-700 truncate">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Properties</p>
                  <div className="space-y-2">
                    {[
                      { icon: Users,    label: 'Type',       value: selected.landlordType === 'private' ? 'Private landlord' : 'Property manager' },
                      { icon: Home,     label: 'Count',      value: selected.propertiesCount },
                      { icon: MapPin,   label: 'Cities',     value: selected.cities },
                    ].filter(({ value }) => value).map(({ icon: Icon, label, value }) => (
                      <div key={label} className="flex items-start gap-3 text-sm">
                        <Icon className="h-3.5 w-3.5 text-gray-300 shrink-0 mt-0.5" />
                        <span className="text-gray-400 w-16 shrink-0 text-xs">{label}</span>
                        <span className="text-gray-700">{value}</span>
                      </div>
                    ))}
                    {selected.propertyDescription && (
                      <div className="mt-2 p-3 bg-gray-50 rounded-xl text-xs text-gray-600 leading-relaxed">
                        {selected.propertyDescription}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Verification call</p>
                  <div className="bg-blue-50 rounded-xl p-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-blue-400 shrink-0" />
                      <span className="text-blue-800 font-medium">{fmtDate(selected.videoCallDate)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Video className="h-4 w-4 text-blue-400 shrink-0" />
                      <span className="text-blue-600 text-xs">{TIME_LABELS[selected.videoCallTime] ?? selected.videoCallTime}</span>
                    </div>
                    {selected.notes && (
                      <p className="text-xs text-blue-500 mt-2 leading-relaxed">{selected.notes}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Action footer */}
              <div className="p-5 border-t border-gray-100 shrink-0">
                <p className="text-xs text-gray-400 mb-3">Verification status</p>
                <div className="flex gap-2">
                  {(['approved', 'pending', 'rejected'] as LandlordStatus[]).filter(s => s !== 'none').map((s) => {
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
        )}
      </div>
    </>
  );
}
