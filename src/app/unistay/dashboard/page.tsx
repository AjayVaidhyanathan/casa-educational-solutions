'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut, updatePassword, reauthenticateWithCredential, EmailAuthProvider, deleteUser } from 'firebase/auth';
import { auth } from '@/lib/unistay/firebase';
import { useAuth } from '@/lib/unistay/auth-context';
import Image from 'next/image';
import {
  Heart, MessageSquare, MapPin, BedDouble, Ruler,
  LogOut, User, ChevronRight, Clock, CheckCircle2, XCircle,
  Bell, Shield, FileText, Upload, Trash2,
  Eye, EyeOff, Lock,
} from 'lucide-react';
import { Button } from '@/components/unistay/ui/button';
import { Card } from '@/components/unistay/ui/card';
import { casaProperties } from '@/lib/unistay/properties';

import { FieldLabel, SoftInput, PrimaryBtn } from '@/components/unistay/ui/form-elements';
import { seedCasaProperties } from '@/lib/unistay/seed-properties';
import { Breadcrumbs } from '@/components/unistay/ui/breadcrumbs';

const SAVED_PROPERTIES = casaProperties.slice(0, 3);

const ENQUIRIES = [
  {
    id: 'e1',
    property: casaProperties[0],
    date: '18 Apr 2026',
    status: 'pending' as const,
    message: "Hi, I am interested in this studio. Is it still available from June?",
  },
  {
    id: 'e2',
    property: casaProperties[1],
    date: '15 Apr 2026',
    status: 'replied' as const,
    message: "I would like to arrange a viewing for the Kreuzberg flat.",
  },
  {
    id: 'e3',
    property: casaProperties[3],
    date: '10 Apr 2026',
    status: 'closed' as const,
    message: 'Is the Munich studio pet-friendly?',
  },
];

const STATUS_CONFIG = {
  pending: { label: 'Pending reply', color: 'text-yellow-600 bg-yellow-50 border-yellow-200', icon: <Clock className="h-3.5 w-3.5" /> },
  replied: { label: 'Replied',       color: 'text-green-600 bg-green-50 border-green-200',    icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  closed:  { label: 'Closed',        color: 'text-gray-500 bg-gray-50 border-gray-200',       icon: <XCircle className="h-3.5 w-3.5" /> },
};

const DOCS = [
  { id: 'passport',   label: 'Passport / ID',          desc: 'Valid government-issued photo ID' },
  { id: 'student',    label: 'Student ID',              desc: 'Current university student card' },
  { id: 'enrolment',  label: 'Proof of Enrolment',      desc: 'Official letter from your university' },
  { id: 'income',     label: 'Proof of Income / Funds', desc: 'Bank statement or sponsorship letter' },
];

type Tab = 'saved' | 'enquiries' | 'documents' | 'notifications' | 'security';

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'saved',         label: 'Saved',         icon: <Heart className="h-4 w-4" /> },
  { key: 'enquiries',     label: 'Enquiries',     icon: <MessageSquare className="h-4 w-4" /> },
  { key: 'documents',     label: 'Documents',     icon: <FileText className="h-4 w-4" /> },
  { key: 'notifications', label: 'Notifications', icon: <Bell className="h-4 w-4" /> },
  { key: 'security',      label: 'Security',      icon: <Shield className="h-4 w-4" /> },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('saved');
  const [saved, setSaved] = useState(SAVED_PROPERTIES.map((p) => p.id));

  // Documents state
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, string>>({
    passport: 'passport_jane_smith.pdf',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeDocUpload, setActiveDocUpload] = useState('');

  // Notifications state
  const [notifs, setNotifs] = useState({
    newListings:   true,
    enquiryUpdate: true,
    newsletter:    false,
    smsAlerts:     false,
    appPush:       true,
  });

  // Security state
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [pwSaved, setPwSaved] = useState(false);
  const [pwError, setPwError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState('');

  const savedProperties = SAVED_PROPERTIES.filter((p) => saved.includes(p.id));

  function unsave(id: string) {
    setSaved((prev) => prev.filter((s) => s !== id));
  }

  function handleDocUpload(docId: string) {
    setActiveDocUpload(docId);
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file && activeDocUpload) {
      setUploadedDocs((prev) => ({ ...prev, [activeDocUpload]: file.name }));
    }
    e.target.value = '';
    setActiveDocUpload('');
  }

  async function handleSignOut() {
    await signOut(auth);
    router.push('/unistay/auth');
  }

  async function handlePwChange(e: React.SyntheticEvent) {
    e.preventDefault();
    setPwError('');
    const currentUser = auth.currentUser;
    if (!currentUser || !currentUser.email) return;
    try {
      const cred = EmailAuthProvider.credential(currentUser.email, oldPw);
      await reauthenticateWithCredential(currentUser, cred);
      await updatePassword(currentUser, newPw);
      setPwSaved(true);
      setOldPw('');
      setNewPw('');
      setTimeout(() => setPwSaved(false), 2500);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      setPwError(code === 'auth/wrong-password' ? 'Current password is incorrect.' : 'Failed to update password. Try again.');
    }
  }

  async function handleDeleteAccount() {
    setDeleteError('');
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    try {
      await deleteUser(currentUser);
      router.push('/unistay/auth');
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      if (code === 'auth/requires-recent-login') {
        setDeleteError('Please sign out and sign back in, then try again.');
      } else {
        setDeleteError('Could not delete account. Please try again.');
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <Breadcrumbs crumbs={[{ label: 'Home', href: '/' }, { label: 'UniStay', href: '/unistay/browse' }, { label: 'Settings' }]} />
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your saved properties, enquiries, documents and account settings</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { icon: <Heart className="h-5 w-5 text-red-500" />, bg: 'bg-red-50', value: savedProperties.length, label: 'Saved' },
            { icon: <MessageSquare className="h-5 w-5 text-blue-600" />, bg: 'bg-blue-50', value: ENQUIRIES.length, label: 'Enquiries' },
            { icon: <FileText className="h-5 w-5 text-green-600" />, bg: 'bg-green-50', value: Object.keys(uploadedDocs).length, label: 'Documents' },
          ].map(({ icon, bg, value, label }) => (
            <Card key={label} className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full ${bg} flex items-center justify-center shrink-0`}>{icon}</div>
              <div>
                <p className="text-xl font-bold text-gray-900">{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            </Card>
          ))}
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar tabs */}
          <div className="lg:w-52 shrink-0">
            <Card className="p-2">
              {TABS.map(({ key, label, icon }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-0.5 ${
                    tab === key
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </Card>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">

            {/* ── SAVED PROPERTIES ── */}
            {tab === 'saved' && (
              <div className="space-y-4">
                <h2 className="font-semibold text-gray-900">Saved Properties</h2>
                {savedProperties.length === 0 ? (
                  <Card className="p-12 text-center">
                    <Heart className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 mb-4">No saved properties yet</p>
                    <Link href="/unistay/search">
                      <Button className="bg-blue-600 hover:bg-blue-700 text-white">Browse properties</Button>
                    </Link>
                  </Card>
                ) : (
                  savedProperties.map((p) => (
                    <Card key={p.id} className="flex gap-4 p-4 items-center">
                      <div className="relative w-24 h-20 rounded-lg overflow-hidden shrink-0">
                        <Image src={p.images[0]} alt={p.title} fill className="object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{p.title}</h3>
                        <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />{p.address}
                        </p>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                          <span className="flex items-center gap-1"><BedDouble className="h-3.5 w-3.5" />{p.bedrooms} bed</span>
                          <span className="flex items-center gap-1"><Ruler className="h-3.5 w-3.5" />{p.size}m²</span>
                          <span className="font-semibold text-blue-600">€{p.price}/mo</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 shrink-0">
                        <Link href={`/unistay/properties/${p.id}`}>
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3">
                            View <ChevronRight className="h-3.5 w-3.5 ml-1" />
                          </Button>
                        </Link>
                        <button
                          onClick={() => unsave(p.id)}
                          className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1 justify-center"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Remove
                        </button>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            )}

            {/* ── ENQUIRIES ── */}
            {tab === 'enquiries' && (
              <div className="space-y-4">
                <h2 className="font-semibold text-gray-900">My Enquiries</h2>
                {ENQUIRIES.map((enq) => {
                  const status = STATUS_CONFIG[enq.status];
                  return (
                    <Card key={enq.id} className="p-5">
                      <div className="flex items-start gap-4">
                        <div className="relative w-16 h-14 rounded-lg overflow-hidden shrink-0">
                          <Image src={enq.property.images[0]} alt={enq.property.title} fill className="object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <div>
                              <h3 className="font-semibold text-gray-900 text-sm">{enq.property.title}</h3>
                              <p className="text-xs text-gray-400 mt-0.5">{enq.date}</p>
                            </div>
                            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full border ${status.color}`}>
                              {status.icon}{status.label}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-2 line-clamp-2">&quot;{enq.message}&quot;</p>
                          <Link href={`/unistay/properties/${enq.property.id}`} className="text-xs text-blue-600 hover:underline mt-2 block">
                            View property
                          </Link>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}



            {/* ── DOCUMENTS ── */}
            {tab === 'documents' && (
              <div className="space-y-4">
                <div>
                  <h2 className="font-semibold text-gray-900">Documents</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Upload documents required by landlords. Max 5 MB per file.</p>
                </div>
                <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleFileChange} />
                {DOCS.map(({ id, label, desc }) => {
                  const uploaded = uploadedDocs[id];
                  return (
                    <Card key={id} className="p-5 flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${uploaded ? 'bg-green-50' : 'bg-gray-100'}`}>
                        <FileText className={`h-5 w-5 ${uploaded ? 'text-green-600' : 'text-gray-400'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{label}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{uploaded ? uploaded : desc}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {uploaded && (
                          <button
                            onClick={() => setUploadedDocs((prev) => { const n = { ...prev }; delete n[id]; return n; })}
                            className="text-xs text-gray-400 hover:text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDocUpload(id)}
                          className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                            uploaded
                              ? 'border-gray-300 text-gray-600 hover:border-blue-400 hover:text-blue-600'
                              : 'border-blue-600 text-blue-600 hover:bg-blue-50'
                          }`}
                        >
                          <Upload className="h-3.5 w-3.5" />
                          {uploaded ? 'Replace' : 'Upload'}
                        </button>
                        {uploaded && (
                          <span className="text-green-600">
                            <CheckCircle2 className="h-4 w-4" />
                          </span>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* ── NOTIFICATIONS ── */}
            {tab === 'notifications' && (
              <Card className="p-6">
                <h2 className="font-semibold text-gray-900 mb-5">Notification Preferences</h2>
                <div className="space-y-1">
                  {[
                    { key: 'newListings',   label: 'New listings matching my search', desc: 'Get notified when a new property matches your filters', category: 'Email' },
                    { key: 'enquiryUpdate', label: 'Enquiry updates',                 desc: 'When a landlord replies to your enquiry', category: 'Email' },
                    { key: 'newsletter',    label: 'Newsletter & tips',               desc: 'Monthly tips for international students', category: 'Email' },
                    { key: 'smsAlerts',     label: 'SMS alerts',                      desc: 'Text messages for urgent updates only', category: 'SMS' },
                    { key: 'appPush',       label: 'Browser notifications',           desc: 'Push notifications in your browser', category: 'Push' },
                  ].map(({ key, label, desc, category }) => (
                    <div key={key} className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-800">{label}</p>
                          <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{category}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                      </div>
                      <button
                        onClick={() => setNotifs((n) => ({ ...n, [key]: !n[key as keyof typeof n] }))}
                        className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
                          notifs[key as keyof typeof notifs] ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                          notifs[key as keyof typeof notifs] ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                      </button>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* ── SECURITY ── */}
            {tab === 'security' && (
              <div className="space-y-4">
                {/* Change Password */}
                <Card className="p-6">
                  <h2 className="font-semibold text-gray-900 mb-4">Change Password</h2>
                  <form onSubmit={handlePwChange} className="space-y-4 max-w-sm">
                    <div>
                      <FieldLabel>Current Password</FieldLabel>
                      <div className="relative">
                        <SoftInput
                          icon={Lock}
                          type={showOld ? 'text' : 'password'}
                          value={oldPw}
                          onChange={(e) => setOldPw(e.target.value)}
                          required
                          className="pr-12"
                        />
                        <button type="button" onClick={() => setShowOld((v) => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-600 transition-colors">
                          {showOld ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <FieldLabel>New Password</FieldLabel>
                      <div className="relative">
                        <SoftInput
                          icon={Lock}
                          type={showNew ? 'text' : 'password'}
                          value={newPw}
                          onChange={(e) => setNewPw(e.target.value)}
                          required
                          placeholder="Min. 8 characters"
                          className="pr-12"
                        />
                        <button type="button" onClick={() => setShowNew((v) => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-600 transition-colors">
                          {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    {pwError && <p className="text-sm text-red-600">{pwError}</p>}
                    <div className="flex items-center gap-3 pt-1">
                      <PrimaryBtn type="submit" className="py-3">Update Password</PrimaryBtn>
                      {pwSaved && (
                        <span className="text-sm text-green-600 flex items-center gap-1">
                          <CheckCircle2 className="h-4 w-4" /> Updated!
                        </span>
                      )}
                    </div>
                  </form>
                </Card>

                {/* Connected accounts */}
                <Card className="p-6">
                  <h2 className="font-semibold text-gray-900 mb-4">Connected Accounts</h2>
                  <div className="flex items-center justify-between py-3 border border-gray-200 rounded-lg px-4">
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-gray-800">Google</p>
                        <p className="text-xs text-gray-400">jane.smith@example.com</p>
                      </div>
                    </div>
                    <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded-full border border-green-200">Connected</span>
                  </div>
                </Card>

                {/* Seed data */}
                <Card className="p-6">
                  <h2 className="font-semibold text-gray-900 mb-1">Database</h2>
                  <p className="text-sm text-gray-500 mb-4">
                    Upload all Casa properties to Firestore so they load from the database. Safe to run multiple times — skips already-seeded properties.
                  </p>
                  <div className="flex items-center gap-3">
                    <PrimaryBtn
                      type="button"
                      disabled={seeding}
                      className="py-3"
                      onClick={async () => {
                        setSeeding(true);
                        setSeedResult('');
                        try {
                          const { seeded, skipped } = await seedCasaProperties();
                          setSeedResult(`Done — ${seeded} uploaded, ${skipped} already existed.`);
                        } catch {
                          setSeedResult('Seed failed. Check console.');
                        } finally {
                          setSeeding(false);
                        }
                      }}
                    >
                      {seeding ? 'Seeding...' : 'Seed Casa Properties to Firestore'}
                    </PrimaryBtn>
                    {seedResult && (
                      <span className="text-sm text-green-600 flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4" /> {seedResult}
                      </span>
                    )}
                  </div>
                </Card>

                {/* Danger zone */}
                <Card className="p-6 border-red-200">
                  <h2 className="font-semibold text-red-600 mb-1">Danger Zone</h2>
                  <p className="text-sm text-gray-500 mb-4">Once you delete your account, all your data will be permanently removed.</p>
                  {!showDeleteConfirm ? (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="text-sm text-red-600 border border-red-300 hover:bg-red-50 px-4 py-2 rounded-lg transition-colors"
                    >
                      Delete my account
                    </button>
                  ) : (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-sm text-red-700 font-medium mb-3">Are you sure? This cannot be undone.</p>
                      {deleteError && <p className="text-sm text-red-600 mb-2">{deleteError}</p>}
                      <div className="flex gap-2">
                        <button onClick={handleDeleteAccount} className="text-sm bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700">
                          Yes, delete my account
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(false)}
                          className="text-sm text-gray-600 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </Card>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
