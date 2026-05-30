'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword, signInWithPopup, updateProfile } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '@/lib/unistay/firebase';
import { DOC_TYPES, DocKey, DocRecord, uploadDocument, formatBytes } from '@/lib/unistay/documents';
import {
  User, Mail, Lock, Eye, EyeOff, GraduationCap, Globe,
  Phone, Calendar, ArrowRight, ArrowLeft, CheckCircle2,
  Upload, FileText, X, Loader2,
} from 'lucide-react';
import { Button } from '@/components/unistay/ui/button';

const STEPS = [
  { number: 1, label: 'Account' },
  { number: 2, label: 'Student Info' },
  { number: 3, label: 'Documents' },
];

const NATIONALITIES = [
  'British', 'German', 'French', 'Spanish', 'Italian', 'Indian', 'Chinese',
  'American', 'Nigerian', 'Brazilian', 'Turkish', 'Pakistani', 'Other',
];

const LEFT_PANEL = [
  { image: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1600', headline: 'Find your home in Germany.', sub: 'Join thousands of students who found their perfect flat through UniStay.' },
  { image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1600', headline: 'Your profile, your story.', sub: 'A complete profile helps landlords say yes — faster.' },
  { image: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1600', headline: 'Verify your application.', sub: 'Uploading your documents now speeds up approval — you can also do this later.' },
  { image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1600', headline: 'You are all set.', sub: 'Start browsing verified student flats across Germany.' },
];

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep]           = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [googleUid, setGoogleUid] = useState('');
  const [createdUid, setCreatedUid] = useState('');

  const [account, setAccount] = useState({ name: '', email: '', password: '' });
  const [student, setStudent] = useState({
    phone: '', nationality: '', university: '',
    program: '', moveInDate: '', bio: '',
  });

  // Document upload state per slot
  const [docRecords, setDocRecords] = useState<Partial<Record<DocKey, DocRecord>>>({});
  const [docProgress, setDocProgress] = useState<Partial<Record<DocKey, number>>>({});
  const [docError, setDocError]       = useState<Partial<Record<DocKey, string>>>({});
  const fileInputRefs = useRef<Partial<Record<DocKey, HTMLInputElement | null>>>({});

  const uid = createdUid || googleUid;

  function nextStep() { setStep((s) => Math.min(s + 1, 4)); }
  function prevStep() { setStep((s) => Math.max(s - 1, 1)); }

  function handleAccountSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    setError('');
    nextStep();
  }

  async function handleStudentSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let uid = googleUid;
      let name = account.name;
      let email = account.email;

      if (!uid) {
        const cred = await createUserWithEmailAndPassword(auth, account.email, account.password);
        await updateProfile(cred.user, { displayName: account.name });
        uid = cred.user.uid;
        setCreatedUid(uid);
      } else {
        const currentUser = auth.currentUser;
        name = currentUser?.displayName ?? name;
        email = currentUser?.email ?? email;
      }

      await setDoc(doc(db, 'users', uid), {
        name, email,
        phone: student.phone,
        nationality: student.nationality,
        university: student.university,
        program: student.program,
        moveInDate: student.moveInDate,
        bio: student.bio,
        role: 'user',
        createdAt: new Date().toISOString(),
        documents: {},
      }, { merge: true });

      nextStep();
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      if (code === 'auth/email-already-in-use') setError('An account with this email already exists.');
      else if (code === 'auth/weak-password')   setError('Password must be at least 6 characters.');
      else { setError('Registration failed. Please try again.'); console.error(err); }
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignUp() {
    setError('');
    setLoading(true);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      // If they already have a complete profile, skip registration and go to profile
      const snap = await getDoc(doc(db, 'users', cred.user.uid));
      if (snap.exists() && !!(snap.data()?.university)) {
        router.replace('/unistay/profile');
        return;
      }
      setGoogleUid(cred.user.uid);
      setAccount((a) => ({ ...a, name: cred.user.displayName ?? '', email: cred.user.email ?? '' }));
      nextStep();
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') { /* ignore */ }
      else if (code === 'auth/popup-blocked') setError('Popup was blocked. Please allow popups and try again.');
      else if (code === 'auth/unauthorized-domain') setError('Add localhost to Authorised Domains in Firebase Console.');
      else if (code === 'auth/operation-not-allowed') setError('Google sign-in is not enabled in Firebase Console.');
      else { setError(`Sign-up failed (${code || 'unknown'}). Check the console.`); console.error(err); }
    } finally {
      setLoading(false);
    }
  }

  async function handleFileSelect(docKey: DocKey, file: File) {
    if (!uid) return;
    setDocError((p) => ({ ...p, [docKey]: undefined }));
    setDocProgress((p) => ({ ...p, [docKey]: 0 }));
    try {
      const record = await uploadDocument(uid, docKey, file, (pct) =>
        setDocProgress((p) => ({ ...p, [docKey]: pct })),
      );
      setDocRecords((p) => ({ ...p, [docKey]: record }));
    } catch {
      setDocError((p) => ({ ...p, [docKey]: 'Upload failed. Please try again.' }));
    } finally {
      setDocProgress((p) => { const n = { ...p }; delete n[docKey]; return n; });
    }
  }

  const panel = LEFT_PANEL[Math.min(step - 1, 3)];
  const uploadedCount = Object.keys(docRecords).length;

  const STEP_HEADLINES = [
    { eyebrow: 'Join UniStay',    headline: "Let's get\nstarted",     sub: 'Create your free student account.' },
    { eyebrow: 'Student Profile', headline: 'Tell us\nabout you',     sub: 'This helps landlords understand your situation.' },
    { eyebrow: 'Documents',       headline: 'Verify your\napplication', sub: 'Upload your documents to speed up approval. You can also do this from your profile later.' },
  ];

  return (
    <div className="flex flex-col bg-white" style={{ height: 'calc(100vh - var(--navbar-height))' }}>
      <main className="flex-1 flex overflow-hidden">
        {/* Left panel */}
        <div className="hidden lg:block relative w-5/12 overflow-hidden">
          <Image src={panel.image} alt="Student housing" fill className="object-cover transition-all duration-700" priority />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
          <div className="absolute bottom-16 left-16 max-w-sm z-10 text-white drop-shadow-lg">
            <h2 className="text-4xl font-bold mb-5 leading-tight tracking-tight">{panel.headline}</h2>
            <div className="h-1 w-16 bg-white/40 mb-5 rounded-full" />
            <p className="text-white/90 text-base leading-relaxed">{panel.sub}</p>
          </div>
        </div>

        {/* Right panel */}
        <div className="w-full lg:w-7/12 flex flex-col justify-center px-8 md:px-16 lg:px-24 py-6 bg-white overflow-y-auto">
          <div className="max-w-lg w-full mx-auto">

            {step < 4 && (
              <>
                {/* Step indicator */}
                <div className="flex items-center gap-2 mb-3">
                  {STEPS.map((s, i) => (
                    <div key={s.number} className="flex items-center gap-2">
                      <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-colors ${
                        step > s.number ? 'bg-green-500 text-white' : step === s.number ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {step > s.number ? <CheckCircle2 className="h-4 w-4" /> : s.number}
                      </div>
                      <span className={`text-xs font-medium ${step === s.number ? 'text-gray-800' : 'text-gray-300'}`}>{s.label}</span>
                      {i < STEPS.length - 1 && <div className={`w-10 h-px mx-1 transition-colors ${step > s.number ? 'bg-green-400' : 'bg-gray-200'}`} />}
                    </div>
                  ))}
                </div>

                {step < 4 && (
                  <>
                    <span className="text-xs font-semibold text-blue-600 uppercase tracking-widest block mb-2">
                      {STEP_HEADLINES[step - 1]?.eyebrow}
                    </span>
                    <h1 className="text-4xl font-bold text-gray-900 mb-2 leading-tight tracking-tight whitespace-pre-line">
                      {STEP_HEADLINES[step - 1]?.headline}
                    </h1>
                    <p className="text-gray-400 mb-3 text-sm">
                      {step === 2 && googleUid
                        ? `Signed in as ${account.name || account.email}. Fill in your student details below.`
                        : STEP_HEADLINES[step - 1]?.sub}
                    </p>
                  </>
                )}
              </>
            )}

            {error && (
              <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</div>
            )}

            {/* ── Step 1: Account ── */}
            {step === 1 && (
              <>
                <button onClick={handleGoogleSignUp} disabled={loading} type="button"
                  className="w-full flex items-center justify-center gap-3 bg-gray-50 border border-gray-200 rounded-xl py-3 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors mb-4 disabled:opacity-50">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Continue with Google
                </button>
                <div className="flex items-center my-3">
                  <div className="flex-1 h-px bg-gray-100" />
                  <span className="px-4 text-xs text-gray-300 uppercase tracking-widest">or</span>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>
                <form onSubmit={handleAccountSubmit} className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2 block">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                      <input type="text" required value={account.name} onChange={(e) => setAccount((a) => ({ ...a, name: e.target.value }))} placeholder="Jane Smith"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-11 pr-5 py-2.5 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2 block">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                      <input type="email" required value={account.email} onChange={(e) => setAccount((a) => ({ ...a, email: e.target.value }))} placeholder="you@example.com"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-11 pr-5 py-2.5 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2 block">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                      <input type={showPassword ? 'text' : 'password'} required minLength={8} value={account.password}
                        onChange={(e) => setAccount((a) => ({ ...a, password: e.target.value }))} placeholder="Min. 8 characters"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-11 pr-12 py-2.5 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                      <button type="button" onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-600 transition-colors">
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {account.password.length > 0 && (
                      <div className="flex gap-1.5 mt-2.5">
                        {[8, 12, 16].map((len) => (
                          <div key={len} className={`flex-1 h-1 rounded-full transition-colors ${account.password.length >= len ? 'bg-blue-500' : 'bg-gray-200'}`} />
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    By registering you agree to our{' '}
                    <span className="text-blue-600 hover:underline cursor-pointer">Terms of Service</span>{' '}and{' '}
                    <span className="text-blue-600 hover:underline cursor-pointer">Privacy Policy</span>.
                  </p>
                  <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 group transition-all">
                    Continue <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </form>
                <p className="text-center text-sm text-gray-400 mt-6">
                  Already have an account?{' '}
                  <Link href="/unistay/auth" className="text-blue-600 font-semibold hover:underline">
                    Sign in
                  </Link>
                </p>
              </>
            )}

            {/* ── Step 2: Student Info ── */}
            {step === 2 && (
              <form onSubmit={handleStudentSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2 block">Nationality</label>
                    <div className="relative">
                      <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300 pointer-events-none" />
                      <select required value={student.nationality} onChange={(e) => setStudent((s) => ({ ...s, nationality: e.target.value }))}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-11 pr-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none">
                        <option value="">Select...</option>
                        {NATIONALITIES.map((n) => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2 block">Phone</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                      <input type="tel" required value={student.phone} onChange={(e) => setStudent((s) => ({ ...s, phone: e.target.value }))} placeholder="+49 ..."
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-11 pr-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2 block">University</label>
                  <div className="relative">
                    <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                    <input type="text" required value={student.university} onChange={(e) => setStudent((s) => ({ ...s, university: e.target.value }))} placeholder="e.g. Technical University of Berlin"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-11 pr-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2 block">Program / Course</label>
                  <input type="text" required value={student.program} onChange={(e) => setStudent((s) => ({ ...s, program: e.target.value }))} placeholder="e.g. MSc Computer Science"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-5 py-2.5 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2 block">Expected Move-in Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                    <input type="date" required value={student.moveInDate} onChange={(e) => setStudent((s) => ({ ...s, moveInDate: e.target.value }))}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-11 pr-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2 block">
                    Short Bio <span className="normal-case text-gray-300 font-normal">(optional)</span>
                  </label>
                  <textarea rows={2} value={student.bio} onChange={(e) => setStudent((s) => ({ ...s, bio: e.target.value }))} placeholder="Tell landlords a bit about yourself..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-5 py-2.5 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                </div>
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={prevStep}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-colors">
                    <ArrowLeft className="h-4 w-4" /> Back
                  </button>
                  <button type="submit" disabled={loading}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 group transition-all disabled:opacity-50">
                    {loading ? (<><Loader2 className="h-4 w-4 animate-spin" /> Creating account…</>) : (<>Continue <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" /></>)}
                  </button>
                </div>
              </form>
            )}

            {/* ── Step 3: Documents ── */}
            {step === 3 && (
              <div className="space-y-3">
                {DOC_TYPES.map(({ key, label, hint }) => {
                  const record   = docRecords[key];
                  const progress = docProgress[key];
                  const err      = docError[key];
                  const uploading = progress !== undefined;

                  return (
                    <div key={key} className={`rounded-xl border px-4 py-3 transition-colors ${record ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'}`}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${record ? 'bg-green-100' : 'bg-gray-100'}`}>
                            {record ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <FileText className="h-4 w-4 text-gray-400" />}
                          </div>
                          <div className="min-w-0">
                            <p className={`text-sm font-medium ${record ? 'text-green-800' : 'text-gray-800'}`}>{label}</p>
                            {record ? (
                              <p className="text-xs text-green-600 truncate">{record.name} · {formatBytes(record.size)}</p>
                            ) : (
                              <p className="text-xs text-gray-400">{hint}</p>
                            )}
                          </div>
                        </div>

                        <div className="shrink-0">
                          {uploading ? (
                            <div className="flex items-center gap-2 text-xs text-blue-600">
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              {progress}%
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => fileInputRefs.current[key]?.click()}
                              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                                record ? 'text-gray-500 hover:bg-gray-100' : 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                              }`}
                            >
                              <Upload className="h-3 w-3" />
                              {record ? 'Replace' : 'Upload'}
                            </button>
                          )}
                        </div>
                      </div>

                      {err && <p className="text-xs text-red-500 mt-1.5">{err}</p>}

                      {uploading && (
                        <div className="mt-2 h-1 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                        </div>
                      )}

                      <input
                        ref={(el) => { fileInputRefs.current[key] = el; }}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(key as DocKey, f); e.target.value = ''; }}
                      />
                    </div>
                  );
                })}

                <p className="text-xs text-gray-400 text-center pt-1">
                  Accepted: PDF, JPG, PNG · Max 10 MB per file
                </p>

                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => nextStep()}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-colors">
                    <X className="h-4 w-4" /> Skip for now
                  </button>
                  <button type="button" onClick={() => nextStep()}
                    disabled={uploadedCount === 0}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 group transition-all">
                    {uploadedCount > 0 ? `Continue (${uploadedCount} uploaded)` : 'Continue'}
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 4: Success ── */}
            {step === 4 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                  <CheckCircle2 className="h-10 w-10 text-green-600" />
                </div>
                <span className="text-xs font-semibold text-blue-600 uppercase tracking-widest block mb-4">Welcome Aboard</span>
                <h1 className="text-5xl font-bold text-gray-900 mb-3 leading-tight tracking-tight">You are all set!</h1>
                <p className="text-gray-400 mb-2 text-base">
                  Welcome to UniStay, <span className="font-semibold text-gray-700">{account.name || 'there'}</span>.
                </p>
                <p className="text-gray-300 text-sm mb-10">
                  {uploadedCount > 0
                    ? `${uploadedCount} document${uploadedCount > 1 ? 's' : ''} uploaded. Casa will review your application soon.`
                    : 'Your account is ready. Upload your documents from your profile when you\'re ready.'}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
                  <Button onClick={() => router.push('/unistay/profile')} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl">
                    View My Profile
                  </Button>
                  <Button onClick={() => router.push('/unistay/search')} variant="outline" className="flex-1 border-gray-200 text-gray-600 hover:border-blue-400 py-4 rounded-xl">
                    Browse Properties
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
