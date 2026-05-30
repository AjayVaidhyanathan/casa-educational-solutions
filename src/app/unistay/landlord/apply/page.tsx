'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc, setDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/unistay/firebase';
import { useAuth } from '@/lib/unistay/auth-context';
import {
  ArrowLeft, ArrowRight, CheckCircle2, Building2, User, Video, Loader2,
} from 'lucide-react';
import {
  FieldLabel, SoftInput, SoftSelect, SoftTextarea,
} from '@/components/unistay/ui/form-elements';
import { Breadcrumbs } from '@/components/unistay/ui/breadcrumbs';

const STEPS = [
  { label: 'About you',       icon: User },
  { label: 'Your properties', icon: Building2 },
  { label: 'Verification',    icon: Video },
];

const COUNTRIES = [
  'Germany', 'Netherlands', 'Austria', 'Switzerland', 'Belgium', 'France',
  'United Kingdom', 'Spain', 'Italy', 'India', 'China', 'Pakistan',
  'Nigeria', 'Turkey', 'United States', 'Other',
];

const TIME_SLOTS = [
  { value: 'morning',   label: 'Morning',   sub: '9:00–12:00' },
  { value: 'afternoon', label: 'Afternoon', sub: '12:00–17:00' },
  { value: 'evening',   label: 'Evening',   sub: '17:00–20:00' },
];

function tomorrowStr() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

export default function LandlordApplyPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [done, setDone] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);

  const [form, setForm] = useState({
    name: '',
    phone: '',
    country: '',
    landlordType: '' as 'private' | 'manager' | '',
    propertiesCount: '',
    cities: '',
    propertyDescription: '',
    videoCallDate: '',
    videoCallTime: '',
    notes: '',
    agreeToTerms: false,
  });

  useEffect(() => {
    if (!user) return;
    setProfileLoading(true);
    getDoc(doc(db, 'users', user.uid))
      .then((snap) => {
        const data = snap.data() ?? {};
        const status = data.landlordStatus as string | undefined;
        if (status === 'pending' || status === 'approved') {
          setBlocked(true);
          router.replace('/unistay/landlord');
          return;
        }
        setForm((f) => ({
          ...f,
          name:  user.displayName ?? (data.name as string) ?? '',
          phone: (data.phone as string) ?? '',
        }));
      })
      .finally(() => setProfileLoading(false));
  }, [user, router]);

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-gray-300" />
      </div>
    );
  }

  if (!user) {
    router.replace('/unistay/register?redirect=landlord/apply');
    return null;
  }

  if (blocked) return null;

  function set<K extends keyof typeof form>(field: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function canNext() {
    if (step === 1) return !!(form.name && form.phone && form.country && form.landlordType);
    if (step === 2) return !!(form.propertiesCount && form.cities);
    if (step === 3) return !!(form.videoCallDate && form.videoCallTime && form.agreeToTerms);
    return false;
  }

  async function handleSubmit() {
    if (!user) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const payload = {
        uid: user.uid,
        name: form.name,
        email: user.email ?? '',
        phone: form.phone,
        country: form.country,
        landlordType: form.landlordType,
        propertiesCount: form.propertiesCount,
        cities: form.cities,
        propertyDescription: form.propertyDescription,
        videoCallDate: form.videoCallDate,
        videoCallTime: form.videoCallTime,
        notes: form.notes,
        status: 'pending',
        appliedAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'landlordApplications', user.uid), payload);
      // merge:true so this works whether or not the user doc already exists
      await setDoc(doc(db, 'users', user.uid), { landlordStatus: 'pending' }, { merge: true });

      // Non-blocking: queue confirmation email via Firebase Trigger Email extension
      const timeLabel = TIME_SLOTS.find((s) => s.value === form.videoCallTime);
      const timeStr   = timeLabel ? `${timeLabel.label} (${timeLabel.sub})` : form.videoCallTime;
      addDoc(collection(db, 'mail'), {
        to: user.email,
        message: {
          subject: 'Your landlord application has been received — Casa',
          html: `
            <p>Hi ${form.name},</p>
            <p>Thanks for applying to list your property on Casa. We've received your application and our team will be in touch to confirm your verification call.</p>
            <p><strong>Requested call slot:</strong> ${form.videoCallDate} — ${timeStr}</p>
            <p>We'll confirm the exact time within 1–2 business days.</p>
            <p>If you have any questions in the meantime, just reply to this email.</p>
            <p>— The Casa Team</p>
          `.trim(),
        },
      }).catch(() => { /* email is best-effort */ });

      setDone(true);
    } catch (err) {
      console.error('[landlord-apply]', err);
      const code = (err as { code?: string }).code ?? '';
      if (code === 'permission-denied') {
        setSubmitError('Permission denied — make sure the landlordApplications Firestore rule is added in the Firebase Console.');
      } else {
        setSubmitError(`Submission failed: ${code || (err as Error).message || 'unknown error'}. Please try again.`);
      }
    } finally {
      setSubmitting(false);
    }
  }

  /* ── Confirmation modal ── */
  if (done) {
    const timeLabel = TIME_SLOTS.find((s) => s.value === form.videoCallTime);
    const timeStr   = timeLabel ? `${timeLabel.label} · ${timeLabel.sub}` : form.videoCallTime;
    return (
      <>
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-10 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">Application submitted!</h2>
            <p className="text-gray-400 text-sm leading-relaxed mb-5">
              We've received your landlord application and will be in touch within 1–2 business days to confirm your verification call.
            </p>

            {/* Call summary */}
            <div className="bg-blue-50 rounded-xl px-5 py-4 text-left space-y-2 mb-6">
              <p className="text-xs font-semibold text-blue-400 uppercase tracking-widest">Requested call slot</p>
              <p className="text-sm font-semibold text-blue-800">{form.videoCallDate}</p>
              <p className="text-xs text-blue-500">{timeStr}</p>
            </div>

            <p className="text-xs text-gray-400 mb-6">
              A confirmation has been sent to <span className="font-medium text-gray-600">{user?.email}</span>.
            </p>

            <button
              onClick={() => router.push('/unistay/browse')}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              Browse properties <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Page stays visible behind the modal */}
        <div className="min-h-screen bg-gray-50 pointer-events-none" aria-hidden />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-xl mx-auto px-4 py-12">
        <Breadcrumbs
          crumbs={[
            { label: 'Home', href: '/' },
            { label: 'UniStay', href: '/unistay/browse' },
            { label: 'Become a landlord', href: '/unistay/landlord' },
            { label: 'Apply' },
          ]}
          className="mb-6"
        />

        {/* Step indicator */}
        <div className="flex items-center mb-8">
          {STEPS.map(({ label }, i) => {
            const n = i + 1;
            const isActive = n === step;
            const isDone = n < step;
            return (
              <div key={label} className="flex items-center flex-1">
                <div className="flex items-center gap-2 shrink-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    isDone   ? 'bg-green-500 text-white'
                    : isActive ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-400'
                  }`}>
                    {isDone ? <CheckCircle2 className="h-4 w-4" /> : n}
                  </div>
                  <span className={`text-xs font-medium hidden sm:block ${isActive ? 'text-gray-800' : 'text-gray-400'}`}>
                    {label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-3 ${isDone ? 'bg-green-400' : 'bg-gray-200'}`} />
                )}
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-8">

          {/* ── Step 1: About you ── */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900">About you</h2>
                <p className="text-sm text-gray-400 mt-1">Tell us who you are as a landlord.</p>
              </div>

              <div>
                <FieldLabel>Full name *</FieldLabel>
                <SoftInput
                  required
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="Jane Müller"
                />
              </div>

              <div>
                <FieldLabel>Phone number *</FieldLabel>
                <SoftInput
                  type="tel"
                  required
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  placeholder="+49 170 000 0000"
                />
              </div>

              <div>
                <FieldLabel>Country of residence *</FieldLabel>
                <SoftSelect
                  required
                  value={form.country}
                  onChange={(e) => set('country', e.target.value)}
                >
                  <option value="">Select country…</option>
                  {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </SoftSelect>
              </div>

              <div>
                <FieldLabel>What describes you best? *</FieldLabel>
                <div className="grid grid-cols-2 gap-3 mt-1">
                  {([
                    { value: 'private' as const, label: 'Private landlord', desc: 'I own 1–2 properties' },
                    { value: 'manager' as const, label: 'Property manager',  desc: '3+ or agency-managed' },
                  ]).map(({ value, label, desc }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => set('landlordType', value)}
                      className={`text-left p-4 rounded-xl border-2 transition-all ${
                        form.landlordType === value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-200'
                      }`}
                    >
                      <p className="text-sm font-semibold text-gray-800">{label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Your properties ── */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Your properties</h2>
                <p className="text-sm text-gray-400 mt-1">Help us understand what you'd like to list.</p>
              </div>

              <div>
                <FieldLabel>How many properties do you plan to list? *</FieldLabel>
                <SoftSelect
                  required
                  value={form.propertiesCount}
                  onChange={(e) => set('propertiesCount', e.target.value)}
                >
                  <option value="">Select…</option>
                  <option value="1">1 property</option>
                  <option value="2-5">2–5 properties</option>
                  <option value="6-20">6–20 properties</option>
                  <option value="20+">More than 20</option>
                </SoftSelect>
              </div>

              <div>
                <FieldLabel>In which cities? *</FieldLabel>
                <SoftInput
                  required
                  value={form.cities}
                  onChange={(e) => set('cities', e.target.value)}
                  placeholder="e.g. Berlin, Munich, Hamburg"
                />
              </div>

              <div>
                <FieldLabel>Brief description (optional)</FieldLabel>
                <SoftTextarea
                  rows={3}
                  value={form.propertyDescription}
                  onChange={(e) => set('propertyDescription', e.target.value)}
                  placeholder="Types of properties, target tenants, anything else we should know…"
                />
              </div>
            </div>
          )}

          {/* ── Step 3: Verification ── */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Schedule verification</h2>
                <p className="text-sm text-gray-400 mt-1">A short video call — no documents needed.</p>
              </div>

              <div className="bg-blue-50 rounded-xl p-4 flex items-start gap-3">
                <Video className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-blue-800">10–15 minute video call</p>
                  <p className="text-xs text-blue-500 mt-0.5 leading-relaxed">
                    Our team will verify your identity and learn about your properties. We'll confirm the exact time by email.
                  </p>
                </div>
              </div>

              <div>
                <FieldLabel>Preferred date *</FieldLabel>
                <SoftInput
                  type="date"
                  required
                  min={tomorrowStr()}
                  value={form.videoCallDate}
                  onChange={(e) => set('videoCallDate', e.target.value)}
                />
              </div>

              <div>
                <FieldLabel>Preferred time *</FieldLabel>
                <div className="grid grid-cols-3 gap-2">
                  {TIME_SLOTS.map(({ value, label, sub }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => set('videoCallTime', value)}
                      className={`p-3 rounded-xl border-2 text-center transition-all ${
                        form.videoCallTime === value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-200'
                      }`}
                    >
                      <p className={`text-xs font-semibold ${form.videoCallTime === value ? 'text-blue-700' : 'text-gray-700'}`}>{label}</p>
                      <p className={`text-[10px] mt-0.5 ${form.videoCallTime === value ? 'text-blue-500' : 'text-gray-400'}`}>{sub}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <FieldLabel>Notes (optional)</FieldLabel>
                <SoftTextarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => set('notes', e.target.value)}
                  placeholder="Any questions or things we should know beforehand…"
                />
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.agreeToTerms}
                  onChange={(e) => set('agreeToTerms', e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                />
                <span className="text-xs text-gray-500 leading-relaxed">
                  I confirm I am the owner or authorised agent for the properties I intend to list, and I agree to Casa's terms for landlords.
                </span>
              </label>
            </div>
          )}

          {/* Submit error */}
          {submitError && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {submitError}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-100">
            <button
              onClick={() => step > 1 ? setStep(step - 1) : router.push('/unistay/landlord')}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              {step > 1 ? 'Back' : 'Cancel'}
            </button>

            {step < 3 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={!canNext()}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!canNext() || submitting}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</>
                  : <>Submit application <CheckCircle2 className="h-4 w-4" /></>
                }
              </button>
            )}
          </div>
        </div>

        {/* Progress hint */}
        <p className="text-center text-xs text-gray-300 mt-4">Step {step} of {STEPS.length}</p>
      </div>
    </div>
  );
}
