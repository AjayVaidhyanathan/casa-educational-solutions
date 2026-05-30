'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/unistay/firebase';
import { useAuth } from '@/lib/unistay/auth-context';
import { DOC_TYPES, DocKey, DocRecord, DocsMap, uploadDocument, formatBytes } from '@/lib/unistay/documents';
import {
  User, Mail, Phone, Globe, GraduationCap, Calendar,
  Camera, CheckCircle2, LogOut, Settings, Heart,
  Edit3, X, ArrowRight, FileText, Search, Upload, Loader2, ExternalLink,
} from 'lucide-react';

import { FieldLabel, SoftInput, SoftTextarea, SoftSelect, PrimaryBtn, OutlineBtn, FormSection } from '@/components/unistay/ui/form-elements';
import { Breadcrumbs } from '@/components/unistay/ui/breadcrumbs';

const NATIONALITIES = [
  'British', 'German', 'French', 'Spanish', 'Italian', 'Indian', 'Chinese',
  'American', 'Nigerian', 'Brazilian', 'Turkish', 'Pakistani', 'Other',
];


export default function ProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRefs = useRef<Partial<Record<DocKey, HTMLInputElement | null>>>({});

  const [profile, setProfile] = useState({
    name: '', email: '', phone: '', nationality: '',
    university: '', program: '', moveInDate: '', bio: '',
  });
  const [draft, setDraft] = useState(profile);
  const [documents, setDocuments] = useState<DocsMap>({});
  const [docProgress, setDocProgress] = useState<Partial<Record<DocKey, number>>>({});
  const [docError, setDocError] = useState<Partial<Record<DocKey, string>>>({});

  useEffect(() => {
    if (!user) return;
    const base = { name: user.displayName ?? '', email: user.email ?? '' };
    setProfile((p) => ({ ...p, ...base })); // eslint-disable-line react-hooks/set-state-in-effect
    setDraft((p) => ({ ...p, ...base })); // eslint-disable-line react-hooks/set-state-in-effect
    getDoc(doc(db, 'users', user.uid)).then((snap) => {
      if (snap.exists()) {
        const data = snap.data() as Partial<typeof profile> & { documents?: DocsMap };
        const { documents: docs, ...profileData } = data;
        setProfile((p) => ({ ...p, ...profileData }));
        setDraft((p) => ({ ...p, ...profileData }));
        if (docs) setDocuments(docs); // eslint-disable-line react-hooks/set-state-in-effect
      } else {
        // Google sign-in users land here without a Firestore doc — create one now
        setDoc(doc(db, 'users', user.uid), {
          name:              user.displayName ?? '',
          email:             user.email ?? '',
          role:              'user',
          documents:         {},
          createdAt:         new Date().toISOString(),
          applicationStatus: 'pending',
        });
      }
    });
  }, [user]);

  async function handleDocUpload(docKey: DocKey, file: File) {
    if (!user) return;
    setDocError((p) => ({ ...p, [docKey]: undefined }));
    setDocProgress((p) => ({ ...p, [docKey]: 0 }));
    try {
      const record = await uploadDocument(user.uid, docKey, file, (pct) =>
        setDocProgress((p) => ({ ...p, [docKey]: pct })),
      );
      setDocuments((p) => ({ ...p, [docKey]: record }));
    } catch {
      setDocError((p) => ({ ...p, [docKey]: 'Upload failed. Please try again.' }));
    } finally {
      setDocProgress((p) => { const n = { ...p }; delete n[docKey]; return n; });
    }
  }

  function startEditing() {
    setDraft(profile);
    setEditing(true);
  }

  function cancelEditing() {
    setDraft(profile);
    setEditing(false);
  }

  async function handleSave(e: React.SyntheticEvent) {
    e.preventDefault();
    if (user) {
      await setDoc(doc(db, 'users', user.uid), draft, { merge: true });
    }
    setProfile(draft);
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function handleSignOut() {
    await signOut(auth);
    router.replace('/unistay/register');
  }

  const docsUploaded = DOC_TYPES.filter(({ key }) => !!documents[key]).length;
  const current = editing ? draft : profile;
  const profileComplete = Math.round(
    ([current.name, current.email, current.phone, current.nationality,
      current.university, current.program, current.moveInDate, current.bio]
      .filter(Boolean).length / 8) * 100
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div>
        {/* Profile header band */}
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-5xl mx-auto px-8 pt-6 pb-12">
            <Breadcrumbs crumbs={[{ label: 'Home', href: '/' }, { label: 'UniStay', href: '/unistay/browse' }, { label: 'Profile' }]} />
            <div className="flex flex-col sm:flex-row items-start gap-8">
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="w-24 h-24 rounded-full bg-blue-50 flex items-center justify-center border-4 border-white shadow-sm">
                  <User className="h-12 w-12 text-blue-300" />
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center border-2 border-white shadow hover:bg-blue-700 transition-colors"
                >
                  <Camera className="h-3.5 w-3.5 text-white" />
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" />
              </div>

              {/* Identity */}
              <div className="flex-1 min-w-0">
                <span className="text-xs font-semibold text-blue-600 uppercase tracking-widest block mb-2">
                  Your Profile
                </span>
                <div className="flex items-center gap-3 mb-1 flex-wrap">
                  <h1 className="text-4xl font-bold text-gray-900 tracking-tight leading-none">
                    {current.name || 'Your Name'}
                  </h1>
                  {saved && (
                    <span className="flex items-center gap-1 text-xs text-green-600 font-medium bg-green-50 px-2.5 py-1 rounded-full">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Saved
                    </span>
                  )}
                </div>
                <p className="text-gray-400 text-sm mb-1">{current.email}</p>
                {(current.university || current.program) && (
                  <p className="text-gray-400 text-sm">
                    {[current.university, current.program].filter(Boolean).join(' · ')}
                  </p>
                )}

                {/* Completion bar */}
                <div className="mt-5 max-w-xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-gray-400">Profile complete</span>
                    <span className="text-xs font-bold text-blue-600">{profileComplete}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all duration-500"
                      style={{ width: `${profileComplete}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Edit / Cancel button */}
              {!editing ? (
                <button
                  onClick={startEditing}
                  className="flex items-center gap-2 text-sm font-semibold px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors shrink-0"
                >
                  <Edit3 className="h-4 w-4" />
                  Edit Profile
                </button>
              ) : (
                <button
                  onClick={cancelEditing}
                  className="flex items-center gap-2 text-sm font-medium px-5 py-3 border border-gray-200 text-gray-500 hover:bg-gray-50 rounded-xl transition-colors shrink-0"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="max-w-5xl mx-auto px-8 py-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Main form */}
            <div className="lg:col-span-2">
              {editing && (
                <div className="flex items-center gap-2 mb-6 bg-blue-50 border border-blue-100 rounded-xl px-5 py-3">
                  <Edit3 className="h-4 w-4 text-blue-600 shrink-0" />
                  <p className="text-sm text-blue-700 font-medium">Edit mode — make your changes and save below.</p>
                </div>
              )}

              <form onSubmit={handleSave}>
                <FormSection title="Personal Information">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <FieldLabel>Full Name</FieldLabel>
                      <SoftInput icon={User} value={draft.name} onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))} placeholder="Jane Smith" disabled={!editing} />
                    </div>
                    <div>
                      <FieldLabel>Email</FieldLabel>
                      <SoftInput icon={Mail} type="email" value={draft.email} onChange={(e) => setDraft((p) => ({ ...p, email: e.target.value }))} placeholder="you@example.com" disabled={!editing} />
                    </div>
                    <div>
                      <FieldLabel>Phone</FieldLabel>
                      <SoftInput icon={Phone} type="tel" value={draft.phone} onChange={(e) => setDraft((p) => ({ ...p, phone: e.target.value }))} placeholder="+49 ..." disabled={!editing} />
                    </div>
                    <div>
                      <FieldLabel>Nationality</FieldLabel>
                      <SoftSelect icon={Globe} value={draft.nationality} onChange={(e) => setDraft((p) => ({ ...p, nationality: e.target.value }))} disabled={!editing}>
                        <option value="">Select...</option>
                        {NATIONALITIES.map((n) => <option key={n} value={n}>{n}</option>)}
                      </SoftSelect>
                    </div>
                    <div>
                      <FieldLabel>University</FieldLabel>
                      <SoftInput icon={GraduationCap} value={draft.university} onChange={(e) => setDraft((p) => ({ ...p, university: e.target.value }))} placeholder="Technical University of Berlin" disabled={!editing} />
                    </div>
                    <div>
                      <FieldLabel>Program / Course</FieldLabel>
                      <SoftInput value={draft.program} onChange={(e) => setDraft((p) => ({ ...p, program: e.target.value }))} placeholder="MSc Computer Science" disabled={!editing} />
                    </div>
                    <div className="sm:col-span-2">
                      <FieldLabel>Expected Move-in Date</FieldLabel>
                      <SoftInput icon={Calendar} type="date" value={draft.moveInDate} onChange={(e) => setDraft((p) => ({ ...p, moveInDate: e.target.value }))} disabled={!editing} />
                    </div>
                  </div>

                  <div className="mt-5">
                    <FieldLabel>
                      Bio <span className="normal-case font-normal text-gray-300">(optional)</span>
                    </FieldLabel>
                    <SoftTextarea rows={3} value={draft.bio} onChange={(e) => setDraft((p) => ({ ...p, bio: e.target.value }))} placeholder="Tell landlords about yourself..." disabled={!editing} />
                  </div>

                  {editing && (
                    <div className="flex items-center gap-3 mt-6 pt-6 border-t border-gray-100">
                      <PrimaryBtn type="submit">
                        Save Changes
                        <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                      </PrimaryBtn>
                      <OutlineBtn type="button" onClick={cancelEditing}>
                        Cancel
                      </OutlineBtn>
                    </div>
                  )}
                </FormSection>
              </form>
            </div>

            {/* Sidebar */}
            <div className="space-y-5">
              {/* Stats */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest block mb-5">
                  Activity
                </span>
                <div className="space-y-4">
                  {[
                    { icon: Heart, label: 'Saved properties', value: '3', color: 'text-red-400', bg: 'bg-red-50' },
                    { icon: Mail, label: 'Enquiries sent', value: '3', color: 'text-blue-400', bg: 'bg-blue-50' },
                  ].map(({ icon: Icon, label, value, color, bg }) => (
                    <div key={label} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 ${bg} rounded-lg flex items-center justify-center`}>
                          <Icon className={`h-4 w-4 ${color}`} />
                        </div>
                        <span className="text-sm text-gray-500">{label}</span>
                      </div>
                      <span className="text-lg font-bold text-gray-800">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Documents */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest block mb-4">Documents</span>
                <div className="space-y-2">
                  {DOC_TYPES.map(({ key, label, hint }) => {
                    const record = documents[key];
                    const progress = docProgress[key];
                    const err = docError[key];
                    const uploading = progress !== undefined;
                    return (
                      <div key={key} className={`rounded-xl border px-3 py-2.5 transition-colors ${record ? 'border-green-200 bg-green-50' : 'border-gray-100 bg-gray-50'}`}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${record ? 'bg-green-100' : 'bg-white border border-gray-200'}`}>
                              {record ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> : <FileText className="h-3 w-3 text-gray-300" />}
                            </div>
                            <div className="min-w-0">
                              <p className={`text-xs font-medium truncate ${record ? 'text-green-800' : 'text-gray-600'}`}>{label}</p>
                              {record ? (
                                <p className="text-[10px] text-green-600 truncate">{record.name}</p>
                              ) : (
                                <p className="text-[10px] text-gray-400">{hint}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {record && (
                              <a href={record.url} target="_blank" rel="noopener noreferrer"
                                className="p-1 text-gray-400 hover:text-blue-600 transition-colors">
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                            {uploading ? (
                              <div className="flex items-center gap-1 text-[10px] text-blue-600">
                                <Loader2 className="h-3 w-3 animate-spin" />{progress}%
                              </div>
                            ) : (
                              <button type="button" onClick={() => docInputRefs.current[key]?.click()}
                                className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-md bg-white border border-gray-200 text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors">
                                <Upload className="h-2.5 w-2.5" />
                                {record ? 'Replace' : 'Upload'}
                              </button>
                            )}
                          </div>
                        </div>
                        {uploading && (
                          <div className="mt-2 h-0.5 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                          </div>
                        )}
                        {err && <p className="text-[10px] text-red-500 mt-1">{err}</p>}
                        <input
                          ref={(el) => { docInputRefs.current[key] = el; }}
                          type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleDocUpload(key as DocKey, f); e.target.value = ''; }}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 pt-4 border-t border-gray-50">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-gray-400">{docsUploaded} of {DOC_TYPES.length} uploaded</span>
                    <span className="text-xs font-bold text-blue-600">{Math.round((docsUploaded / DOC_TYPES.length) * 100)}%</span>
                  </div>
                  <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full transition-all duration-500"
                      style={{ width: `${(docsUploaded / DOC_TYPES.length) * 100}%` }} />
                  </div>
                </div>
              </div>

              {/* Quick links */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest block mb-4">
                  Quick Links
                </span>
                <div className="space-y-1">
                  {[
                    { href: '/unistay/search', icon: Search, label: 'Browse properties' },
                    { href: '/unistay/dashboard', icon: Settings, label: 'Settings' },
                    { href: '/unistay/dashboard', icon: FileText, label: 'My enquiries' },
                  ].map(({ href, icon: Icon, label }) => (
                    <Link
                      key={label}
                      href={href}
                      className="flex items-center gap-3 py-2.5 text-sm text-gray-600 hover:text-blue-600 transition-colors group"
                    >
                      <Icon className="h-4 w-4 text-gray-300 group-hover:text-blue-400 transition-colors" />
                      {label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
