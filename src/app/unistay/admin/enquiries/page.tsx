'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/unistay/firebase';
import {
  Search, X, Mail, Phone, Calendar, Home, Loader2,
  ChevronDown, MessageSquare, CheckCircle2, Clock, XCircle, ChevronRight,
} from 'lucide-react';

type EnquiryStatus = 'new' | 'in_progress' | 'resolved';

interface Enquiry {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  moveIn?: string | null;
  message: string;
  propertyId: string;
  propertyTitle: string;
  userId?: string | null;
  status: EnquiryStatus;
  createdAt?: string;
}

const STATUS_CFG: Record<EnquiryStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  new:         { label: 'New',         color: 'text-blue-700',  bg: 'bg-blue-50  border-blue-200',  icon: <MessageSquare className="h-3 w-3" /> },
  in_progress: { label: 'In progress', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', icon: <Clock         className="h-3 w-3" /> },
  resolved:    { label: 'Resolved',    color: 'text-green-700', bg: 'bg-green-50 border-green-200', icon: <CheckCircle2  className="h-3 w-3" /> },
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

export default function AdminEnquiriesPage() {
  const [enquiries, setEnquiries]   = useState<Enquiry[]>([]);
  const [loading, setLoading]       = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [selected, setSelected]     = useState<Enquiry | null>(null);
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatusFilter] = useState<EnquiryStatus | 'all'>('all');
  const [updating, setUpdating]     = useState(false);

  useEffect(() => {
    setLoading(true);
    setFetchError('');
    getDocs(collection(db, 'enquiries'))
      .then((snap) => {
        const list: Enquiry[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id:            d.id,
            name:          data.name          ?? '—',
            email:         data.email         ?? '—',
            phone:         data.phone,
            moveIn:        data.moveIn,
            message:       data.message       ?? '',
            propertyId:    data.propertyId    ?? '',
            propertyTitle: data.propertyTitle ?? '—',
            userId:        data.userId,
            status:        data.status        ?? 'new',
            createdAt:     toIso(data.createdAt),
          };
        });
        setEnquiries(list.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '')));
      })
      .catch((err) => {
        const code: string = err?.code ?? '';
        if (code.includes('permission') || code.includes('unauthorized')) {
          setFetchError('Firestore permission denied. Add an enquiries read rule for authenticated users.');
        } else {
          setFetchError(`Could not load enquiries: ${code || err?.message || 'unknown error'}`);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enquiries.filter((e) => {
      if (statusFilter !== 'all' && e.status !== statusFilter) return false;
      if (!q) return true;
      return (e.name + e.email + e.propertyTitle + e.message).toLowerCase().includes(q);
    });
  }, [enquiries, search, statusFilter]);

  async function setStatus(enquiry: Enquiry, status: EnquiryStatus) {
    setUpdating(true);
    try {
      await updateDoc(doc(db, 'enquiries', enquiry.id), { status });
      const updated = { ...enquiry, status };
      setEnquiries((prev) => prev.map((e) => e.id === enquiry.id ? updated : e));
      setSelected(updated);
    } finally {
      setUpdating(false);
    }
  }

  const stats = useMemo(() => ({
    total:       enquiries.length,
    new:         enquiries.filter((e) => e.status === 'new').length,
    in_progress: enquiries.filter((e) => e.status === 'in_progress').length,
    resolved:    enquiries.filter((e) => e.status === 'resolved').length,
  }), [enquiries]);

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {([
          { label: 'Total',       value: stats.total,       color: 'text-gray-900'  },
          { label: 'New',         value: stats.new,         color: 'text-blue-600'  },
          { label: 'In progress', value: stats.in_progress, color: 'text-amber-600' },
          { label: 'Resolved',    value: stats.resolved,    color: 'text-green-600' },
        ] as const).map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 px-5 py-4">
            <p className="text-xs text-gray-400 mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, property…"
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
            onChange={(e) => setStatusFilter(e.target.value as EnquiryStatus | 'all')}
            className="h-9 appearance-none pl-3 pr-8 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="all">All statuses</option>
            <option value="new">New</option>
            <option value="in_progress">In progress</option>
            <option value="resolved">Resolved</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
        </div>
      </div>

      <div className="flex gap-6">
        {/* Table */}
        <div className={`flex-1 min-w-0 transition-all ${selected ? 'lg:max-w-[55%]' : ''}`}>
          {loading ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
              <Loader2 className="h-5 w-5 animate-spin text-gray-300 mx-auto" />
            </div>
          ) : fetchError ? (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
              <XCircle className="h-8 w-8 text-red-300 mx-auto mb-3" />
              <p className="text-red-700 text-sm font-medium mb-1">Could not load enquiries</p>
              <p className="text-red-400 text-xs max-w-sm mx-auto">{fetchError}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
              <MessageSquare className="h-8 w-8 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm font-medium">No enquiries found</p>
              <p className="text-gray-300 text-xs mt-1">
                {enquiries.length === 0 ? 'Property enquiries will appear here.' : 'Try adjusting your filters.'}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">From</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell">Property</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Date</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((e) => {
                    const cfg = STATUS_CFG[e.status];
                    const isActive = selected?.id === e.id;
                    return (
                      <tr
                        key={e.id}
                        onClick={() => setSelected(isActive ? null : e)}
                        className={`cursor-pointer transition-colors ${isActive ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                              <span className="text-blue-600 text-xs font-bold">{e.name.charAt(0).toUpperCase()}</span>
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-gray-800 truncate">{e.name}</p>
                              <p className="text-xs text-gray-400 truncate">{e.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3.5 hidden sm:table-cell">
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Home className="h-3 w-3 shrink-0 text-gray-300" />
                            <span className="truncate max-w-[160px]">{e.propertyTitle}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3.5">
                          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${cfg.color} ${cfg.bg}`}>
                            {cfg.icon}{cfg.label}
                          </span>
                        </td>
                        <td className="px-3 py-3.5 text-xs text-gray-400 hidden md:table-cell">{fmtDate(e.createdAt)}</td>
                        <td className="px-3 py-3.5">
                          <ChevronRight className={`h-4 w-4 text-gray-300 transition-transform ${isActive ? 'rotate-90' : ''}`} />
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
              {/* Header */}
              <div className="flex items-start justify-between p-5 border-b border-gray-100 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-blue-600 font-bold">{selected.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{selected.name}</p>
                    <p className="text-xs text-gray-400">{fmtDate(selected.createdAt)}</p>
                  </div>
                </div>
                <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Body */}
              <div className="overflow-y-auto flex-1 p-5 space-y-5">
                {/* Contact info */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Contact</p>
                  <div className="space-y-2">
                    {[
                      { icon: Mail,     label: 'Email',   value: selected.email,               href: `mailto:${selected.email}` },
                      { icon: Phone,    label: 'Phone',   value: selected.phone  ?? null,       href: selected.phone ? `tel:${selected.phone}` : undefined },
                      { icon: Calendar, label: 'Move-in', value: selected.moveIn ?? null,       href: undefined },
                      { icon: Home,     label: 'Property',value: selected.propertyTitle,        href: `/unistay/properties/${selected.propertyId}` },
                    ].filter(({ value }) => value).map(({ icon: Icon, label, value, href }) => (
                      <div key={label} className="flex items-center gap-3 text-sm">
                        <Icon className="h-3.5 w-3.5 text-gray-300 shrink-0" />
                        <span className="text-gray-400 w-20 shrink-0 text-xs">{label}</span>
                        {href
                          ? <a href={href} target={href.startsWith('/') ? '_blank' : undefined} className="text-blue-600 hover:underline truncate text-xs">{value}</a>
                          : <span className="text-gray-700 truncate text-xs">{value}</span>
                        }
                      </div>
                    ))}
                  </div>
                </div>

                {/* Message */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Message</p>
                  <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {selected.message}
                  </div>
                </div>

                {/* Quick reply */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Quick reply</p>
                  <a
                    href={`mailto:${selected.email}?subject=Re: Your enquiry about ${encodeURIComponent(selected.propertyTitle)}&body=Hi ${encodeURIComponent(selected.name)},%0A%0AThank you for your enquiry about ${encodeURIComponent(selected.propertyTitle)}.%0A%0A`}
                    className="flex items-center justify-center gap-2 w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors"
                  >
                    <Mail className="h-4 w-4" />
                    Reply via email
                  </a>
                </div>
              </div>

              {/* Status footer */}
              <div className="p-5 border-t border-gray-100 shrink-0">
                <p className="text-xs text-gray-400 mb-3">Update status</p>
                <div className="flex gap-2">
                  {(['new', 'in_progress', 'resolved'] as EnquiryStatus[]).map((s) => {
                    const cfg = STATUS_CFG[s];
                    const isActive = selected.status === s;
                    return (
                      <button
                        key={s}
                        onClick={() => setStatus(selected, s)}
                        disabled={updating || isActive}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border transition-colors disabled:cursor-default ${
                          isActive ? `${cfg.color} ${cfg.bg} border-current` : 'border-gray-200 text-gray-400 hover:border-gray-300 bg-white'
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
