'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/unistay/firebase';
import { useAuth } from '@/lib/unistay/auth-context';
import {
  ArrowLeft, ArrowRight, CheckCircle2, Clock, XCircle, Loader2,
  MapPin, Euro, Calendar, Ruler, Users, BedDouble,
  Wifi, Car, Sofa, Zap, TreePine, Upload, Home, Building2,
} from 'lucide-react';
import Link from 'next/link';
import { FieldLabel, SoftInput, SoftSelect, SoftTextarea } from '@/components/unistay/ui/form-elements';
import { Breadcrumbs } from '@/components/unistay/ui/breadcrumbs';
import type { LandlordStatus } from '@/lib/unistay/types';

/* ── Step metadata ─────────────────────────────────────────────────────────── */
const STEPS = [
  { label: 'Type of place' },
  { label: 'Location' },
  { label: 'Pricing' },
  { label: 'Rental period' },
  { label: 'Space' },
  { label: 'Bedroom' },
  { label: 'Finishing touches' },
];

const TOTAL = STEPS.length;

/* ── Option helpers ────────────────────────────────────────────────────────── */
const PLACE_KINDS = [
  { value: 'room',      label: 'Private room',   desc: 'Tenants rent a room and share common areas' },
  { value: 'studio',    label: 'Studio',          desc: 'Self-contained studio apartment' },
  { value: 'apartment', label: 'Whole apartment', desc: 'Tenants rent the entire unit' },
  { value: 'shared',    label: 'Shared room',     desc: 'Tenants share a room with others' },
];

const PROPERTY_STRUCTURES = [
  { value: 'house',       label: 'House' },
  { value: 'apartment',   label: 'Apartment building' },
  { value: 'student_res', label: 'Student residence' },
  { value: 'other',       label: 'Other' },
];

const MIN_PERIODS  = ['1', '2', '3', '6', '12'];
const MAX_PERIODS  = ['1', '3', '6', '12', '24', 'none'];
const GENDER_OPTS  = [
  { value: 'male',   label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'mixed',  label: 'Mixed' },
  { value: 'na',     label: 'No housemates' },
];
const FEATURES = [
  { id: 'furnished', label: 'Furnished',      icon: Sofa },
  { id: 'wifi',      label: 'WiFi included',  icon: Wifi },
  { id: 'bills',     label: 'Bills included', icon: Zap  },
  { id: 'parking',   label: 'Parking',        icon: Car  },
  { id: 'balcony',   label: 'Balcony',        icon: TreePine },
];

type YN = 'yes' | 'no' | '';

interface FormState {
  kind: string;
  structure: string;
  city: string;
  street: string;
  rent: string;
  availableFrom: string;
  minPeriod: string;
  maxPeriod: string;
  propertySize: string;
  housemates: string;
  housematesGender: string;
  capacity: string;
  bedroomSize: string;
  furnished: YN;
  doorLock: YN;
  description: string;
  title: string;
}

const EMPTY: FormState = {
  kind: '', structure: '', city: '', street: '',
  rent: '', availableFrom: '',
  minPeriod: '', maxPeriod: '',
  propertySize: '', housemates: '', housematesGender: '', capacity: '',
  bedroomSize: '', furnished: '', doorLock: '',
  description: '', title: '',
};

/* ── YesNo toggle ──────────────────────────────────────────────────────────── */
function YesNo({ value, onChange }: { value: YN; onChange: (v: YN) => void }) {
  return (
    <div className="flex gap-3">
      {(['no', 'yes'] as YN[]).map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={`flex-1 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
            value === v
              ? 'border-blue-500 bg-blue-50 text-blue-700'
              : 'border-gray-200 text-gray-500 hover:border-blue-200'
          }`}
        >
          {v === 'yes' ? 'Yes' : 'No'}
        </button>
      ))}
    </div>
  );
}

/* ── Step validation ───────────────────────────────────────────────────────── */
function canProceed(step: number, form: FormState, features: string[]) {
  switch (step) {
    case 1: return !!(form.kind && form.structure);
    case 2: return !!(form.city && form.street);
    case 3: return !!(form.rent && form.availableFrom);
    case 4: return !!(form.minPeriod && form.maxPeriod);
    case 5: return !!(form.propertySize && form.housematesGender && form.capacity);
    case 6: return !!(form.bedroomSize && form.furnished && form.doorLock && form.description);
    case 7: return !!(form.title);
    default: return false;
  }
}

/* ── Gate screens ──────────────────────────────────────────────────────────── */
function PendingGate() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-gray-200 p-10 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <Clock className="h-8 w-8 text-amber-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Application under review</h2>
        <p className="text-gray-400 text-sm leading-relaxed mb-6">
          Our team is verifying your landlord application. You'll be able to list as soon as you're approved.
        </p>
        <Link href="/unistay/browse" className="text-sm text-blue-600 hover:underline">← Back to browse</Link>
      </div>
    </div>
  );
}

function RejectedGate() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-gray-200 p-10 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <XCircle className="h-8 w-8 text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Verification not approved</h2>
        <p className="text-gray-400 text-sm leading-relaxed mb-6">
          Your landlord application was not approved. Contact us if you think this is a mistake.
        </p>
        <Link
          href="/unistay/landlord/apply"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          Re-apply <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

/* ── Main page ─────────────────────────────────────────────────────────────── */
export default function ListPropertyPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [landlordStatus, setLandlordStatus] = useState<LandlordStatus | null>(null);
  const [gateLoading, setGateLoading] = useState(true);

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [features, setFeatures] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace('/unistay/register?redirect=list-property'); return; }
    getDoc(doc(db, 'users', user.uid))
      .then((snap) => {
        const status = (snap.data()?.landlordStatus as LandlordStatus) ?? 'none';
        setLandlordStatus(status);
        if (status === 'none' || !snap.data()?.landlordStatus) {
          router.replace('/unistay/landlord');
        }
      })
      .catch(() => setLandlordStatus('none'))
      .finally(() => setGateLoading(false));
  }, [user, authLoading, router]);

  if (authLoading || gateLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-gray-300" />
      </div>
    );
  }

  if (landlordStatus === 'pending')  return <PendingGate />;
  if (landlordStatus === 'rejected') return <RejectedGate />;
  if (landlordStatus !== 'approved') return null;

  function setField<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function toggleFeature(id: string) {
    setFeatures((prev) => prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]);
  }

  async function handleSubmit() {
    if (!user) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      await addDoc(collection(db, 'listings'), {
        title:            form.title,
        type:             form.kind,
        structure:        form.structure,
        city:             form.city,
        address:          `${form.street}, ${form.city}`,
        street:           form.street,
        price:            Number(form.rent),
        size:             Number(form.propertySize),
        availableFrom:    form.availableFrom,
        minPeriod:        Number(form.minPeriod),
        maxPeriod:        form.maxPeriod === 'none' ? null : Number(form.maxPeriod),
        housemates:       Number(form.housemates) || 0,
        housematesGender: form.housematesGender,
        capacity:         Number(form.capacity),
        bedroomSize:      Number(form.bedroomSize),
        furnished:        form.furnished === 'yes',
        doorLock:         form.doorLock === 'yes',
        description:      form.description,
        features,
        bedrooms:         form.kind === 'apartment' ? 1 : 1,
        images:           [],
        status:           'pending_review',
        landlordVerified: true,
        submittedBy:      user.uid,
        submittedAt:      serverTimestamp(),
      });
      setSubmitted(true);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      const msg  = (err as { message?: string }).message ?? '';
      if (code === 'permission-denied') {
        setSubmitError('Permission denied — update your Firestore security rules to allow authenticated writes to the listings collection.');
      } else {
        setSubmitError(`Submission failed: ${msg || code || 'unknown error'}`);
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-12 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Listing submitted!</h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            Our team will review <span className="font-medium text-gray-600">"{form.title}"</span> and publish it within 24 hours.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
            <button
              onClick={() => { setSubmitted(false); setForm(EMPTY); setFeatures([]); setStep(1); }}
              className="px-6 py-3 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              List another
            </button>
            <button
              onClick={() => router.push('/unistay/dashboard')}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              Go to dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const progressPct = ((step - 1) / TOTAL) * 100;
  const ok = canProceed(step, form, features);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <Breadcrumbs
          crumbs={[
            { label: 'Home', href: '/' },
            { label: 'UniStay', href: '/unistay/browse' },
            { label: 'List a property' },
          ]}
          className="mb-6"
        />

        {/* Header + progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
              {STEPS[step - 1].label}
            </span>
            <span className="text-xs text-gray-400">{step} / {TOTAL}</span>
          </div>
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-300"
              style={{ width: `${progressPct + (100 / TOTAL)}%` }}
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-8">

          {/* ── Step 1: Type of place ── */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">What kind of place are you listing?</h2>
                <p className="text-sm text-gray-400 mt-1">Choose what best describes the space tenants will rent.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PLACE_KINDS.map(({ value, label, desc }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setField('kind', value)}
                    className={`text-left p-4 rounded-xl border-2 transition-all ${
                      form.kind === value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-200'
                    }`}
                  >
                    <p className="text-sm font-semibold text-gray-800">{label}</p>
                    <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{desc}</p>
                  </button>
                ))}
              </div>

              <div>
                <h3 className="text-base font-semibold text-gray-800 mb-3">What type of property is this?</h3>
                <div className="grid grid-cols-2 gap-2">
                  {PROPERTY_STRUCTURES.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setField('structure', value)}
                      className={`flex items-center gap-2.5 p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                        form.structure === value ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-blue-200'
                      }`}
                    >
                      {value === 'house' ? <Home className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Location ── */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Where is the property?</h2>
                <p className="text-sm text-gray-400 mt-1">The exact address is shown to tenants only after enquiry.</p>
              </div>
              <div>
                <FieldLabel>City *</FieldLabel>
                <SoftInput
                  icon={MapPin}
                  required
                  value={form.city}
                  onChange={(e) => setField('city', e.target.value)}
                  placeholder="e.g. Berlin"
                />
              </div>
              <div>
                <FieldLabel>Street and house number *</FieldLabel>
                <SoftInput
                  required
                  value={form.street}
                  onChange={(e) => setField('street', e.target.value)}
                  placeholder="e.g. Friedrichstr. 12"
                />
              </div>
            </div>
          )}

          {/* ── Step 3: Pricing ── */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Pricing and availability</h2>
              </div>
              <div>
                <FieldLabel>Monthly rent (€) *</FieldLabel>
                <SoftInput
                  icon={Euro}
                  type="number"
                  required
                  min="1"
                  value={form.rent}
                  onChange={(e) => setField('rent', e.target.value)}
                  placeholder="850"
                />
                <p className="text-xs text-gray-400 mt-1.5">Basic price in euros. You can add cost breakdowns after listing.</p>
              </div>
              <div>
                <FieldLabel>Available from *</FieldLabel>
                <SoftInput
                  icon={Calendar}
                  type="date"
                  required
                  value={form.availableFrom}
                  onChange={(e) => setField('availableFrom', e.target.value)}
                />
              </div>
            </div>
          )}

          {/* ── Step 4: Rental period ── */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Rental period</h2>
                <p className="text-sm text-gray-400 mt-1">Set the minimum and maximum stay duration.</p>
              </div>

              <div>
                <FieldLabel>Minimum rental period *</FieldLabel>
                <div className="flex gap-2 flex-wrap">
                  {MIN_PERIODS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setField('minPeriod', m)}
                      className={`px-4 py-2 rounded-xl border-2 text-sm font-medium transition-all ${
                        form.minPeriod === m ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-blue-200'
                      }`}
                    >
                      {m} {m === '1' ? 'month' : 'months'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <FieldLabel>Maximum rental period *</FieldLabel>
                <div className="flex gap-2 flex-wrap">
                  {MAX_PERIODS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setField('maxPeriod', m)}
                      className={`px-4 py-2 rounded-xl border-2 text-sm font-medium transition-all ${
                        form.maxPeriod === m ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-blue-200'
                      }`}
                    >
                      {m === 'none' ? 'No limit' : `${m} ${m === '1' ? 'month' : 'months'}`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Step 5: Space overview ── */}
          {step === 5 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Space overview</h2>
                <p className="text-sm text-gray-400 mt-1">Help tenants understand who they'll be living with.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel>Property size (m²) *</FieldLabel>
                  <SoftInput
                    icon={Ruler}
                    type="number"
                    min="1"
                    required
                    value={form.propertySize}
                    onChange={(e) => setField('propertySize', e.target.value)}
                    placeholder="35"
                  />
                </div>
                <div>
                  <FieldLabel>Suitable for how many? *</FieldLabel>
                  <SoftInput
                    icon={Users}
                    type="number"
                    min="1"
                    required
                    value={form.capacity}
                    onChange={(e) => setField('capacity', e.target.value)}
                    placeholder="1"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Max people who can live in this space</p>
                </div>
              </div>

              <div>
                <FieldLabel>Number of housemates</FieldLabel>
                <SoftInput
                  type="number"
                  min="0"
                  value={form.housemates}
                  onChange={(e) => setField('housemates', e.target.value)}
                  placeholder="0"
                />
                <p className="text-[10px] text-gray-400 mt-1">People the new tenant will share common areas with</p>
              </div>

              <div>
                <FieldLabel>Housemates gender *</FieldLabel>
                <div className="grid grid-cols-2 gap-2">
                  {GENDER_OPTS.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setField('housematesGender', value)}
                      className={`py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                        form.housematesGender === value
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 text-gray-600 hover:border-blue-200'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-gray-400 mt-1.5">Tenants filter by housemate gender — keep this accurate</p>
              </div>
            </div>
          )}

          {/* ── Step 6: Bedroom ── */}
          {step === 6 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Bedroom details</h2>
              </div>

              <div>
                <FieldLabel>Bedroom size (m²) *</FieldLabel>
                <SoftInput
                  icon={BedDouble}
                  type="number"
                  min="1"
                  required
                  value={form.bedroomSize}
                  onChange={(e) => setField('bedroomSize', e.target.value)}
                  placeholder="12"
                />
              </div>

              <div>
                <FieldLabel>Bedroom furnished? *</FieldLabel>
                <YesNo value={form.furnished} onChange={(v) => setField('furnished', v)} />
              </div>

              <div>
                <FieldLabel>Lock on bedroom door? *</FieldLabel>
                <YesNo value={form.doorLock} onChange={(v) => setField('doorLock', v)} />
              </div>

              <div>
                <FieldLabel>Description *</FieldLabel>
                <SoftTextarea
                  required
                  rows={4}
                  value={form.description}
                  onChange={(e) => setField('description', e.target.value)}
                  placeholder="Describe distances to nearby shops, public transport, house rules, tenant information, anything else that's relevant…"
                />
              </div>
            </div>
          )}

          {/* ── Step 7: Finishing touches ── */}
          {step === 7 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Finishing touches</h2>
                <p className="text-sm text-gray-400 mt-1">Give your listing a title and highlight what's included.</p>
              </div>

              <div>
                <FieldLabel>Listing title *</FieldLabel>
                <SoftInput
                  required
                  value={form.title}
                  onChange={(e) => setField('title', e.target.value)}
                  placeholder={`e.g. Sunny ${form.kind === 'room' ? 'private room' : form.kind === 'studio' ? 'studio' : 'apartment'} near university`}
                />
              </div>

              <div>
                <FieldLabel>What's included?</FieldLabel>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {FEATURES.map(({ id, label, icon: Icon }) => {
                    const active = features.includes(id);
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => toggleFeature(id)}
                        className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                          active ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500 hover:border-blue-200'
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <FieldLabel>Photos</FieldLabel>
                <label
                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all"
                  onClick={() => photoInputRef.current?.click()}
                >
                  <Upload className="h-6 w-6 text-gray-300 mb-2" />
                  <p className="text-sm text-gray-400">Click to upload photos</p>
                  <p className="text-xs text-gray-300 mt-0.5">PNG, JPG up to 10 MB each</p>
                  <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden" />
                </label>
                <p className="text-xs text-gray-400 mt-1.5">Photos can also be added later via your dashboard.</p>
              </div>

              {/* Summary */}
              <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-1.5 border border-gray-100">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Summary</p>
                {[
                  ['Type',      PLACE_KINDS.find(k => k.value === form.kind)?.label ?? form.kind],
                  ['City',      form.city],
                  ['Rent',      form.rent ? `€${form.rent}/month` : '—'],
                  ['Available', form.availableFrom],
                  ['Size',      form.propertySize ? `${form.propertySize} m²` : '—'],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-gray-400">{label}</span>
                    <span className="text-gray-700 font-medium">{value}</span>
                  </div>
                ))}
              </div>

              {submitError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  {submitError}
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
            <button
              onClick={() => step > 1 ? setStep(step - 1) : router.push('/unistay/landlord')}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              {step > 1 ? 'Back' : 'Cancel'}
            </button>

            {step < TOTAL ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={!ok}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!ok || submitting}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</>
                  : <>Submit for review <CheckCircle2 className="h-4 w-4" /></>
                }
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-gray-300 mt-4">
          Listings are reviewed by our team before going live — usually within 24 hours.
        </p>
      </div>
    </div>
  );
}
