'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/unistay/firebase';
import { DOC_TYPES, DocKey, DocRecord } from '@/lib/unistay/documents';
import {
  Search, X, CheckCircle2, FileText, ExternalLink,
  User, Mail, Phone, GraduationCap, Globe, Calendar,
  Clock, XCircle, Loader2, ChevronDown, Users,
} from 'lucide-react';

type AppStatus = 'pending' | 'approved' | 'rejected';

interface Candidate {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  nationality?: string;
  university?: string;
  program?: string;
  moveInDate?: string;
  bio?: string;
  createdAt?: string;
  applicationStatus?: AppStatus;
  documents?: Partial<Record<DocKey, DocRecord>>;
}

const STATUS_CFG: Record<AppStatus, { label: string; color: string; bg: string; ring: string; icon: React.ReactNode }> = {
  pending:  { label: 'Pending',  color: 'text-amber-700', bg: 'bg-amber-50  border-amber-200',  ring: 'ring-amber-300',  icon: <Clock        className="h-3 w-3" /> },
  approved: { label: 'Approved', color: 'text-green-700', bg: 'bg-green-50  border-green-200',  ring: 'ring-green-300',  icon: <CheckCircle2 className="h-3 w-3" /> },
  rejected: { label: 'Rejected', color: 'text-red-700',   bg: 'bg-red-50   border-red-200',    ring: 'ring-red-300',    icon: <XCircle      className="h-3 w-3" /> },
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function fmtDate(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function initials(name: string, email: string) {
  const src = name?.trim() || email;
  const parts = src.split(/[\s@]/);
  return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : src.slice(0, 2).toUpperCase();
}

export default function AdminCandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading]       = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [selected, setSelected]     = useState<Candidate | null>(null);
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatusFilter] = useState<AppStatus | 'all'>('all');
  const [updating, setUpdating]     = useState(false);

  useEffect(() => {
    setLoading(true);
    setFetchError('');
    getDocs(collection(db, 'users'))
      .then((snap) => {
        const list: Candidate[] = snap.docs
          .filter((d) => d.data().role !== 'admin')
          .map((d) => ({ uid: d.id, ...d.data() } as Candidate));
        setCandidates(list.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '')));
      })
      .catch((err) => {
        const code: string = err?.code ?? '';
        if (code.includes('permission') || code.includes('unauthorized')) {
          setFetchError('Firestore permission denied. Update your security rules to allow reads when authenticated.');
        } else {
          setFetchError(`Could not load candidates: ${code || err?.message || 'unknown error'}`);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return candidates.filter((c) => {
      const status = c.applicationStatus ?? 'pending';
      if (statusFilter !== 'all' && status !== statusFilter) return false;
      if (!q) return true;
      return (c.name + c.email + (c.university ?? '')).toLowerCase().includes(q);
    });
  }, [candidates, search, statusFilter]);

  async function setStatus(candidate: Candidate, status: AppStatus) {
    setUpdating(true);
    try {
      await updateDoc(doc(db, 'users', candidate.uid), { applicationStatus: status });
      const updated = { ...candidate, applicationStatus: status };
      setCandidates((prev) => prev.map((c) => c.uid === candidate.uid ? updated : c));
      setSelected(updated);
    } finally {
      setUpdating(false);
    }
  }

  const stats = useMemo(() => ({
    total:    candidates.length,
    pending:  candidates.filter((c) => (c.applicationStatus ?? 'pending') === 'pending').length,
    approved: candidates.filter((c) => c.applicationStatus === 'approved').length,
    rejected: candidates.filter((c) => c.applicationStatus === 'rejected').length,
  }), [candidates]);

  const docsUploaded = (c: Candidate) => DOC_TYPES.filter(({ key }) => !!c.documents?.[key]).length;

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

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, university…"
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
            onChange={(e) => setStatusFilter(e.target.value as AppStatus | 'all')}
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
              <p className="text-red-700 text-sm font-medium mb-1">Could not load candidates</p>
              <p className="text-red-400 text-xs leading-relaxed max-w-sm mx-auto">{fetchError}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
              <Users className="h-8 w-8 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm font-medium">No candidates found</p>
              <p className="text-gray-300 text-xs mt-1">
                {candidates.length === 0
                  ? 'Registered users will appear here.'
                  : 'Try adjusting your filters.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((c) => {
                const status = c.applicationStatus ?? 'pending';
                const cfg = STATUS_CFG[status];
                const uploaded = docsUploaded(c);
                const isActive = selected?.uid === c.uid;
                return (
                  <button
                    key={c.uid}
                    onClick={() => setSelected(isActive ? null : c)}
                    className={`text-left w-full bg-white rounded-2xl border p-4 transition-all hover:shadow-md ${
                      isActive ? 'border-blue-400 ring-2 ring-blue-200 shadow-md' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {/* Avatar + name */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                          <span className="text-blue-600 text-sm font-bold">{initials(c.name, c.email)}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-800 truncate text-sm">{c.name || '—'}</p>
                          <p className="text-xs text-gray-400 truncate">{c.email}</p>
                        </div>
                      </div>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ml-2 ${cfg.color} ${cfg.bg}`}>
                        {cfg.icon}{cfg.label}
                      </span>
                    </div>

                    {/* University */}
                    {(c.university || c.program) && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-3 truncate">
                        <GraduationCap className="h-3 w-3 shrink-0 text-gray-300" />
                        <span className="truncate">{[c.university, c.program].filter(Boolean).join(' · ')}</span>
                      </div>
                    )}

                    {/* Document slots */}
                    <div className="flex items-center gap-2 mt-auto">
                      <div className="flex gap-1.5 flex-1">
                        {DOC_TYPES.map(({ key, label }) => {
                          const uploaded = !!c.documents?.[key];
                          return (
                            <div
                              key={key}
                              title={label}
                              className={`flex-1 h-6 rounded-md flex items-center justify-center text-[9px] font-semibold tracking-wide ${
                                uploaded
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-gray-100 text-gray-400'
                              }`}
                            >
                              {uploaded ? <CheckCircle2 className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                            </div>
                          );
                        })}
                      </div>
                      <span className="text-xs text-gray-400 shrink-0">{uploaded}/{DOC_TYPES.length}</span>
                    </div>

                    {/* Doc labels */}
                    <div className="flex gap-1.5 mt-1">
                      {DOC_TYPES.map(({ key, label }) => (
                        <div key={key} className="flex-1 text-center">
                          <span className="text-[9px] text-gray-300 leading-tight block truncate">{label.split('/')[0]}</span>
                        </div>
                      ))}
                      <div className="shrink-0 w-7" />
                    </div>
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
              {/* Panel header */}
              <div className="flex items-start justify-between p-5 border-b border-gray-100 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-blue-600 font-bold">{initials(selected.name, selected.email)}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{selected.name || '—'}</p>
                    <p className="text-xs text-gray-400">Joined {fmtDate(selected.createdAt)}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Scrollable body */}
              <div className="overflow-y-auto flex-1 p-5 space-y-6">
                {/* Profile */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Profile</p>
                  <div className="space-y-2">
                    {[
                      { icon: Mail,          label: 'Email',      value: selected.email },
                      { icon: Phone,         label: 'Phone',      value: selected.phone },
                      { icon: Globe,         label: 'Nationality',value: selected.nationality },
                      { icon: GraduationCap, label: 'University', value: selected.university },
                      { icon: User,          label: 'Program',    value: selected.program },
                      { icon: Calendar,      label: 'Move-in',    value: selected.moveInDate ? fmtDate(selected.moveInDate) : undefined },
                    ].filter(({ value }) => value).map(({ icon: Icon, label, value }) => (
                      <div key={label} className="flex items-center gap-3 text-sm">
                        <Icon className="h-3.5 w-3.5 text-gray-300 shrink-0" />
                        <span className="text-gray-400 w-20 shrink-0 text-xs">{label}</span>
                        <span className="text-gray-700 truncate">{value}</span>
                      </div>
                    ))}
                  </div>
                  {selected.bio && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-xl text-xs text-gray-600 leading-relaxed">
                      {selected.bio}
                    </div>
                  )}
                </div>

                {/* Documents */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Documents</p>
                  <div className="space-y-2">
                    {DOC_TYPES.map(({ key, label, hint }) => {
                      const record = selected.documents?.[key];
                      return (
                        <div
                          key={key}
                          className={`flex items-center justify-between rounded-xl px-3 py-3 border ${
                            record ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-100'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                              record ? 'bg-green-100' : 'bg-white border border-gray-200'
                            }`}>
                              {record
                                ? <CheckCircle2 className="h-4 w-4 text-green-600" />
                                : <FileText     className="h-3.5 w-3.5 text-gray-300" />}
                            </div>
                            <div className="min-w-0">
                              <p className={`text-xs font-semibold truncate ${record ? 'text-green-800' : 'text-gray-500'}`}>
                                {label}
                              </p>
                              {record
                                ? <p className="text-[10px] text-green-600 truncate">{record.name}</p>
                                : <p className="text-[10px] text-gray-400">{hint}</p>}
                            </div>
                          </div>
                          {record && (
                            <a
                              href={record.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-1 text-[10px] font-semibold text-blue-600 hover:text-blue-700 shrink-0 ml-2 px-2 py-1 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                            >
                              <ExternalLink className="h-3 w-3" /> View
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Action footer */}
              <div className="p-5 border-t border-gray-100 shrink-0">
                <p className="text-xs text-gray-400 mb-3">Application status</p>
                <div className="flex gap-2">
                  {(['approved', 'pending', 'rejected'] as AppStatus[]).map((s) => {
                    const cfg = STATUS_CFG[s];
                    const isActive = (selected.applicationStatus ?? 'pending') === s;
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
