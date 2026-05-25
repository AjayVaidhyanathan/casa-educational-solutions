'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/unistay/firebase';
import { useAuth } from '@/lib/unistay/auth-context';
import {
  User, Mail, Phone, Globe, GraduationCap, Calendar,
  Camera, CheckCircle2, LogOut, Settings, Heart,
  Edit3, X, ArrowRight, FileText, Search,
} from 'lucide-react';

import { FieldLabel, SoftInput, SoftTextarea, SoftSelect, PrimaryBtn, OutlineBtn, FormSection } from '@/components/unistay/ui/form-elements';
import { Breadcrumbs } from '@/components/unistay/ui/breadcrumbs';

const DOCS_STATUS = [
  { label: 'Passport / ID',           uploaded: true },
  { label: 'Student ID',              uploaded: true },
  { label: 'Proof of Enrolment',      uploaded: false },
  { label: 'Proof of Income / Funds', uploaded: false },
];

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

  const [profile, setProfile] = useState({
    name: '', email: '', phone: '', nationality: '',
    university: '', program: '', moveInDate: '', bio: '',
  });
  const [draft, setDraft] = useState(profile);

  useEffect(() => {
    if (!user) return;
    const base = { name: user.displayName ?? '', email: user.email ?? '' };
    setProfile((p) => ({ ...p, ...base })); // eslint-disable-line react-hooks/set-state-in-effect
    setDraft((p) => ({ ...p, ...base })); // eslint-disable-line react-hooks/set-state-in-effect
    getDoc(doc(db, 'users', user.uid)).then((snap) => {
      if (snap.exists()) {
        const data = snap.data() as Partial<typeof profile>;
        setProfile((p) => ({ ...p, ...data }));
        setDraft((p) => ({ ...p, ...data }));
      }
    });
  }, [user]);

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
    router.push('/unistay/auth');
  }

  const docsUploaded = DOCS_STATUS.filter((d) => d.uploaded).length;
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
                <div className="flex items-center justify-between mb-5">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                    Documents
                  </span>
                  <Link href="/unistay/dashboard" className="text-xs text-blue-600 hover:underline font-medium">
                    Manage
                  </Link>
                </div>
                <div className="space-y-3">
                  {DOCS_STATUS.map(({ label, uploaded }) => (
                    <div key={label} className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${uploaded ? 'bg-green-100' : 'bg-gray-100'}`}>
                        {uploaded
                          ? <CheckCircle2 className="h-3 w-3 text-green-600" />
                          : <span className="w-1.5 h-1.5 bg-gray-300 rounded-full block" />}
                      </div>
                      <span className={`text-sm ${uploaded ? 'text-gray-700' : 'text-gray-300'}`}>
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-gray-50">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-gray-400">{docsUploaded} of {DOCS_STATUS.length} uploaded</span>
                    <span className="text-xs font-bold text-blue-600">{Math.round((docsUploaded / DOCS_STATUS.length) * 100)}%</span>
                  </div>
                  <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full"
                      style={{ width: `${(docsUploaded / DOCS_STATUS.length) * 100}%` }}
                    />
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
