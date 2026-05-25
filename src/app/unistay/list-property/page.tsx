'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/unistay/firebase';
import { useAuth } from '@/lib/unistay/auth-context';
import {
  MapPin, BedDouble, Ruler, Calendar, Euro,
  CheckCircle2, Upload, Wifi, Car, Sofa, Zap, TreePine,
  User, Mail, Phone, ArrowLeft, Lock, ArrowRight,
} from 'lucide-react';

import { FieldLabel, SoftInput, SoftTextarea, SoftSelect, PrimaryBtn, OutlineBtn, FormSection } from '@/components/unistay/ui/form-elements';
import { Breadcrumbs } from '@/components/unistay/ui/breadcrumbs';

const FEATURES = [
  { id: 'furnished', label: 'Furnished',      icon: <Sofa className="h-4 w-4" /> },
  { id: 'wifi',      label: 'WiFi included',  icon: <Wifi className="h-4 w-4" /> },
  { id: 'bills',     label: 'Bills included', icon: <Zap className="h-4 w-4" /> },
  { id: 'parking',   label: 'Parking',        icon: <Car className="h-4 w-4" /> },
  { id: 'balcony',   label: 'Balcony',        icon: <TreePine className="h-4 w-4" /> },
];

const PROPERTY_TYPES = [
  { value: 'studio',    label: 'Studio' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'room',      label: 'Private Room' },
  { value: 'shared',    label: 'Shared Room' },
];

const CITIES = [
  'Berlin', 'Munich', 'Hamburg', 'Frankfurt', 'Cologne',
  'Stuttgart', 'Düsseldorf', 'Leipzig', 'Dresden', 'Nuremberg',
];

export default function ListPropertyPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    title: '',
    type: '',
    city: '',
    address: '',
    price: '',
    bedrooms: '',
    size: '',
    availableFrom: '',
    description: '',
    contactName: user?.displayName ?? '',
    contactEmail: user?.email ?? '',
    contactPhone: '',
  });
  const [features, setFeatures] = useState<string[]>([]);

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function toggleFeature(id: string) {
    setFeatures((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'listings'), {
        ...form,
        price: Number(form.price),
        bedrooms: Number(form.bedrooms),
        size: Number(form.size),
        features,
        status: 'pending_review',
        submittedBy: user?.uid ?? 'anonymous',
        submittedAt: new Date().toISOString(),
      });
      setSubmitted(true);
    } catch (err: unknown) {
      console.error('Firestore write error:', err);
      const code = (err as { code?: string }).code ?? '';
      if (code === 'permission-denied') {
        setError('Permission denied — Firestore security rules are blocking writes. Update your rules in the Firebase Console.');
      } else if (code === 'unavailable' || code === 'deadline-exceeded') {
        setError('Could not reach the database. Check your internet connection and try again.');
      } else {
        const msg = (err as { message?: string }).message ?? '';
        setError(`Submission failed: ${msg || 'unknown error'}. Check the browser console.`);
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-300 text-sm">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div>
        <div className="max-w-3xl mx-auto px-8 py-12">
          <Breadcrumbs crumbs={[{ label: 'Home', href: '/' }, { label: 'UniStay', href: '/unistay/browse' }, { label: 'List a Property' }]} />

          {/* Success state */}
          {submitted ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-14 text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
              <span className="text-xs font-semibold text-blue-600 uppercase tracking-widest block mb-4">
                Submitted
              </span>
              <h2 className="text-4xl font-bold text-gray-900 mb-3 tracking-tight">Listing received!</h2>
              <p className="text-gray-400 mb-2">Thank you for submitting your property.</p>
              <p className="text-sm text-gray-300 mb-10">Our team will review your listing and get back to you within 24 hours.</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <PrimaryBtn onClick={() => router.push('/')}>Back to home</PrimaryBtn>
                <OutlineBtn onClick={() => {
                  setSubmitted(false);
                  setForm({ title: '', type: '', city: '', address: '', price: '', bedrooms: '', size: '', availableFrom: '', description: '', contactName: user?.displayName ?? '', contactEmail: user?.email ?? '', contactPhone: '' });
                  setFeatures([]);
                }}>
                  Submit another
                </OutlineBtn>
              </div>
            </div>
          ) : (
            <>
              {/* Page header */}
              <div className="mb-10">
                <span className="text-xs font-semibold text-blue-600 uppercase tracking-widest block mb-3">
                  Property Listing
                </span>
                <h1 className="text-4xl font-bold text-gray-900 tracking-tight mb-2">
                  List your property
                </h1>
                <p className="text-gray-400">Fill in the details below. Our team reviews every submission before it goes live.</p>
              </div>

              {/* Not logged in banner */}
              {!user && (
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 mb-8 flex items-start gap-3">
                  <Lock className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-blue-800">Sign in to track your listings</p>
                    <p className="text-xs text-blue-500 mt-0.5">
                      You can still submit as a guest, but{' '}
                      <Link href="/unistay/auth" className="underline font-medium">signing in</Link>{' '}
                      lets you manage submissions from your dashboard.
                    </p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">

                {/* Property details */}
                <FormSection title="Property Details">
                  <div className="space-y-5">
                    <div>
                      <FieldLabel>Listing Title</FieldLabel>
                      <SoftInput
                        required
                        value={form.title}
                        onChange={(e) => set('title', e.target.value)}
                        placeholder="e.g. Modern Studio near TU Berlin"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <FieldLabel>Property Type</FieldLabel>
                        <SoftSelect required value={form.type} onChange={(e) => set('type', e.target.value)}>
                          <option value="">Select type...</option>
                          {PROPERTY_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </SoftSelect>
                      </div>
                      <div>
                        <FieldLabel>City</FieldLabel>
                        <SoftSelect icon={MapPin} required value={form.city} onChange={(e) => set('city', e.target.value)}>
                          <option value="">Select city...</option>
                          {CITIES.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </SoftSelect>
                      </div>
                    </div>

                    <div>
                      <FieldLabel>Full Address</FieldLabel>
                      <SoftInput
                        icon={MapPin}
                        required
                        value={form.address}
                        onChange={(e) => set('address', e.target.value)}
                        placeholder="e.g. Friedrichstr. 12, Mitte"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <FieldLabel>Rent / month (€)</FieldLabel>
                        <SoftInput
                          icon={Euro}
                          type="number"
                          required
                          min="1"
                          value={form.price}
                          onChange={(e) => set('price', e.target.value)}
                          placeholder="850"
                        />
                      </div>
                      <div>
                        <FieldLabel>Bedrooms</FieldLabel>
                        <SoftInput
                          icon={BedDouble}
                          type="number"
                          required
                          min="1"
                          value={form.bedrooms}
                          onChange={(e) => set('bedrooms', e.target.value)}
                          placeholder="1"
                        />
                      </div>
                      <div>
                        <FieldLabel>Size (m²)</FieldLabel>
                        <SoftInput
                          icon={Ruler}
                          type="number"
                          required
                          min="1"
                          value={form.size}
                          onChange={(e) => set('size', e.target.value)}
                          placeholder="35"
                        />
                      </div>
                    </div>

                    <div>
                      <FieldLabel>Available From</FieldLabel>
                      <SoftInput
                        icon={Calendar}
                        type="date"
                        required
                        value={form.availableFrom}
                        onChange={(e) => set('availableFrom', e.target.value)}
                      />
                    </div>

                    <div>
                      <FieldLabel>Description</FieldLabel>
                      <SoftTextarea
                        required
                        rows={4}
                        value={form.description}
                        onChange={(e) => set('description', e.target.value)}
                        placeholder="Describe the property — location, nearby transport, condition, house rules..."
                      />
                    </div>
                  </div>
                </FormSection>

                {/* Features */}
                <FormSection title="What's Included?">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {FEATURES.map(({ id, label, icon }) => {
                      const active = features.includes(id);
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => toggleFeature(id)}
                          className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                            active
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'border-gray-200 text-gray-500 hover:border-blue-300 bg-white'
                          }`}
                        >
                          {icon}
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </FormSection>

                {/* Photos */}
                <FormSection title="Photos" subtitle="Upload up to 10 photos. First photo will be the cover image.">
                  <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all">
                    <Upload className="h-7 w-7 text-gray-300 mb-2" />
                    <p className="text-sm text-gray-400">Click to upload photos</p>
                    <p className="text-xs text-gray-300 mt-0.5">PNG, JPG up to 10 MB each</p>
                    <input type="file" accept="image/*" multiple className="hidden" />
                  </label>
                </FormSection>

                {/* Contact */}
                <FormSection title="Your Contact Details">
                  <div className="space-y-5">
                    <div>
                      <FieldLabel>Full Name</FieldLabel>
                      <SoftInput
                        icon={User}
                        required
                        value={form.contactName}
                        onChange={(e) => set('contactName', e.target.value)}
                        placeholder="Jane Smith"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <FieldLabel>Email</FieldLabel>
                        <SoftInput
                          icon={Mail}
                          type="email"
                          required
                          value={form.contactEmail}
                          onChange={(e) => set('contactEmail', e.target.value)}
                          placeholder="you@example.com"
                        />
                      </div>
                      <div>
                        <FieldLabel>Phone</FieldLabel>
                        <SoftInput
                          icon={Phone}
                          type="tel"
                          value={form.contactPhone}
                          onChange={(e) => set('contactPhone', e.target.value)}
                          placeholder="+49 ..."
                        />
                      </div>
                    </div>
                  </div>
                </FormSection>

                {error && (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-5 py-4">
                    {error}
                  </div>
                )}

                <PrimaryBtn
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 text-base"
                >
                  {submitting ? 'Submitting...' : 'Submit Listing for Review'}
                  {!submitting && <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />}
                </PrimaryBtn>
                <p className="text-xs text-gray-300 text-center">
                  Listings are reviewed by our team before going live. Usually within 24 hours.
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
