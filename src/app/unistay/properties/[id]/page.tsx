'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';

const PropertyDetailMap = dynamic(() => import('@/components/unistay/PropertyDetailMap'), { ssr: false });
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/unistay/firebase';
import { useAuth } from '@/lib/unistay/auth-context';
import {
  MapPin, BedDouble, Ruler, Calendar, ChevronLeft, ChevronRight,
  Heart, Share2, Wifi, Car, Sofa, Zap, TreePine, CheckCircle2, Mail, Loader2,
} from 'lucide-react';
import { Button } from '@/components/unistay/ui/button';
import { Card } from '@/components/unistay/ui/card';
import { casaProperties } from '@/lib/unistay/properties';
import { useFirestoreProperty } from '@/lib/unistay/useFirestoreListings';
import { Breadcrumbs } from '@/components/unistay/ui/breadcrumbs';
import type { CasaProperty } from '@/lib/unistay/types';

// ── Configure Casa contact details ────────────────────────────────────────────
const CASA_WHATSAPP = '4915XXXXXXXXX'; // Replace with your number, no + or spaces
const CASA_EMAIL    = 'contact@casasolutions.com';
// ─────────────────────────────────────────────────────────────────────────────

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

const FEATURE_ICONS: Record<string, { icon: React.ReactNode; label: string }> = {
  furnished: { icon: <Sofa className="h-5 w-5" />,     label: 'Furnished' },
  wifi:      { icon: <Wifi className="h-5 w-5" />,     label: 'WiFi included' },
  bills:     { icon: <Zap className="h-5 w-5" />,      label: 'Bills included' },
  parking:   { icon: <Car className="h-5 w-5" />,      label: 'Parking' },
  balcony:   { icon: <TreePine className="h-5 w-5" />, label: 'Balcony' },
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split('-');
  return `${parseInt(day)} ${MONTHS[parseInt(month) - 1]} ${year}`;
}

function _isValidEmail(e: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

type FormErrors = { name?: string; email?: string; message?: string; _form?: string };

export default function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const { property: firestoreProperty, loading: propLoading, error: propError } = useFirestoreProperty(id);
  const staticProperty = casaProperties.find((p) => p.id === id) ?? null;
  const property: CasaProperty | null = firestoreProperty ?? staticProperty;

  const [imageIndex, setImageIndex] = useState(0);
  const [saved, setSaved] = useState(false);
  const [shared, setShared] = useState(false);

  const [waSent, setWaSent] = useState(false);

  // Mobile sticky bar visibility
  const formRef = useRef<HTMLDivElement>(null);
  const [formVisible, setFormVisible] = useState(false);
  useEffect(() => {
    const el = formRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => setFormVisible(entry.isIntersecting), { threshold: 0.1 }); // eslint-disable-line react-hooks/set-state-in-effect
    obs.observe(el);
    return () => obs.disconnect();
  }, [formRef.current]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: property?.title ?? 'Property', url });
    } else {
      navigator.clipboard.writeText(url).then(() => {
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      });
    }
  }

  function scrollToForm() {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function handleWhatsAppClick() {
    if (!property) return;
    try {
      await addDoc(collection(db, 'enquiries'), {
        name:          user?.displayName ?? 'WhatsApp visitor',
        email:         user?.email ?? null,
        message:       `Contacted via WhatsApp about "${property.title}"`,
        propertyId:    id,
        propertyTitle: property.title,
        userId:        user?.uid ?? null,
        channel:       'whatsapp',
        status:        'new',
        createdAt:     serverTimestamp(),
      });
    } catch { /* non-blocking — WhatsApp still opens */ }
    setWaSent(true);
  }

  /* ── Loading states ── */
  if (propLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 pt-8 pb-8 max-w-6xl">
          {/* skeleton nav */}
          <div className="h-5 w-48 bg-gray-200 rounded animate-pulse mb-6" />
          {/* skeleton gallery */}
          <div className="h-72 sm:h-96 rounded-2xl bg-gray-200 animate-pulse mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <div className="h-8 w-2/3 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-1/3 bg-gray-200 rounded animate-pulse" />
              <div className="grid grid-cols-3 gap-4">
                {[1,2,3].map(i => <div key={i} className="h-20 bg-gray-200 rounded-xl animate-pulse" />)}
              </div>
              <div className="space-y-2">
                {[1,2,3,4].map(i => <div key={i} className="h-4 bg-gray-200 rounded animate-pulse" />)}
              </div>
            </div>
            <div className="space-y-4">
              <div className="h-36 bg-gray-200 rounded-xl animate-pulse" />
              <div className="h-64 bg-gray-200 rounded-xl animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 text-lg mb-4">
            {propError ? 'Could not load this property.' : 'Property not found.'}
          </p>
          <Link href="/unistay/search" className="text-blue-600 hover:underline text-sm">← Back to search</Link>
        </div>
      </div>
    );
  }

  const images = property.images;
  const billsIncluded = property.features.includes('bills');

  function prevImage() { setImageIndex((i) => (i === 0 ? images.length - 1 : i - 1)); }
  function nextImage() { setImageIndex((i) => (i === images.length - 1 ? 0 : i + 1)); }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 pt-8 pb-24 max-w-6xl">

        {/* Nav */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 transition-colors shrink-0"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>
          <Breadcrumbs
            crumbs={[
              { label: 'Home', href: '/' },
              { label: 'UniStay', href: '/unistay/browse' },
              { label: 'Search', href: '/unistay/search' },
              { label: property.title },
            ]}
            className=""
          />
        </div>

        {/* Image Gallery */}
        <div className="relative h-72 sm:h-96 rounded-2xl overflow-hidden mb-4 bg-gray-200">
          <Image src={images[imageIndex]} alt={property.title} fill className="object-cover" />

          {images.length > 1 && (
            <>
              <button onClick={prevImage} className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow transition">
                <ChevronLeft className="h-5 w-5 text-gray-700" />
              </button>
              <button onClick={nextImage} className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow transition">
                <ChevronRight className="h-5 w-5 text-gray-700" />
              </button>
            </>
          )}
          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
              {images.map((_, i) => (
                <button key={i} onClick={() => setImageIndex(i)} className={`w-2 h-2 rounded-full transition-colors ${i === imageIndex ? 'bg-white' : 'bg-white/50'}`} />
              ))}
            </div>
          )}

          <div className="absolute top-4 left-4">
            <span className="inline-flex items-center gap-1 bg-blue-600 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 bg-white rounded-full" />
              Casa Managed
            </span>
          </div>
          <div className="absolute top-4 right-4 flex gap-2">
            <button onClick={() => setSaved((s) => !s)} className="bg-white/90 hover:bg-white rounded-full p-2 shadow transition">
              <Heart className={`h-5 w-5 ${saved ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
            </button>
            <button onClick={handleShare} title={shared ? 'Link copied!' : 'Share'} className="bg-white/90 hover:bg-white rounded-full p-2 shadow transition">
              <Share2 className={`h-5 w-5 ${shared ? 'text-blue-600' : 'text-gray-600'}`} />
            </button>
          </div>
        </div>

        {/* Thumbnail strip */}
        {images.length > 1 && (
          <div className="flex gap-2 mb-8 overflow-x-auto pb-1">
            {images.map((src, i) => (
              <button key={i} onClick={() => setImageIndex(i)} className={`relative shrink-0 w-20 h-14 rounded-lg overflow-hidden border-2 transition ${i === imageIndex ? 'border-blue-600' : 'border-transparent'}`}>
                <Image src={src} alt="" fill className="object-cover" />
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Details */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{property.title}</h1>
              <p className="text-gray-500 flex items-center gap-1.5">
                <MapPin className="h-4 w-4 shrink-0" />
                {property.address}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {[
                { icon: <BedDouble className="h-5 w-5 text-blue-600" />, label: 'Bedrooms',       value: `${property.bedrooms} bed` },
                { icon: <Ruler    className="h-5 w-5 text-blue-600" />, label: 'Size',            value: `${property.size} m²` },
                { icon: <Calendar className="h-5 w-5 text-blue-600" />, label: 'Available from',  value: formatDate(property.availableFrom) },
              ].map(({ icon, label, value }) => (
                <Card key={label} className="p-4 text-center">
                  <div className="flex justify-center mb-1">{icon}</div>
                  <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                  <p className="text-sm font-semibold text-gray-800">{value}</p>
                </Card>
              ))}
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">About this property</h2>
              <p className="text-gray-600 leading-relaxed">{property.description}</p>
            </div>

            {property.coldRent !== undefined && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Cost breakdown</h2>
                <div className="rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
                  <div className="flex justify-between items-center px-4 py-3 text-sm bg-white">
                    <div>
                      <span className="text-gray-800 font-medium">Kaltmiete</span>
                      <span className="text-gray-400 ml-2 text-xs">cold rent</span>
                    </div>
                    <span className="font-medium text-gray-900">€{property.coldRent.toLocaleString()}<span className="text-gray-400 font-normal">/mo</span></span>
                  </div>
                  {property.utilityEstimate !== undefined && (
                    <div className="flex justify-between items-center px-4 py-3 text-sm bg-white">
                      <div>
                        <span className="text-gray-800 font-medium">Nebenkosten</span>
                        <span className="text-gray-400 ml-2 text-xs">utilities &amp; service charges</span>
                      </div>
                      <span className="font-medium text-gray-900">~€{property.utilityEstimate.toLocaleString()}<span className="text-gray-400 font-normal">/mo</span></span>
                    </div>
                  )}
                  <div className="flex justify-between items-center px-4 py-3 text-sm bg-gray-50">
                    <div>
                      <span className="font-semibold text-gray-900">Warmmiete</span>
                      <span className="text-gray-400 ml-2 text-xs">total monthly rent</span>
                    </div>
                    <span className="font-bold text-blue-600 text-base">€{property.price.toLocaleString()}<span className="text-gray-400 font-normal text-sm">/mo</span></span>
                  </div>
                </div>
                {property.utilityEstimate !== undefined && !billsIncluded && (
                  <p className="text-xs text-gray-400 mt-2">Utility costs are estimates based on typical usage. Actual amounts may vary.</p>
                )}
              </div>
            )}

            {property.features.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">What&apos;s included</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {property.features.map((f) => {
                    const feat = FEATURE_ICONS[f];
                    return (
                      <div key={f} className="flex items-center gap-2.5 text-sm text-gray-700">
                        <div className="text-blue-600">{feat?.icon ?? <CheckCircle2 className="h-5 w-5" />}</div>
                        {feat?.label ?? f}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right: Price + Enquiry */}
          <div className="space-y-4">
            {/* Price card */}
            <Card className="p-5">
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-3xl font-bold text-gray-900">€{property.price.toLocaleString()}</span>
                <span className="text-gray-400 text-sm">/month</span>
              </div>
              <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full mb-3 ${billsIncluded ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {billsIncluded ? 'Bills included' : 'Bills not included'}
              </span>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Property type</span>
                  <span className="font-medium capitalize text-gray-800">{property.type}</span>
                </div>
                <div className="flex justify-between">
                  <span>City</span>
                  <span className="font-medium text-gray-800">{property.city}</span>
                </div>
              </div>
            </Card>

            {/* Contact card */}
            <Card className="p-5" ref={formRef}>
              <h3 className="font-semibold text-gray-900 mb-1">Interested in this property?</h3>
              <p className="text-sm text-gray-400 mb-5">Chat with Casa on WhatsApp — we reply within a few hours.</p>

              {authLoading ? (
                <div className="flex items-center justify-center py-6 gap-2 text-sm text-gray-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : (
                <>
                  <a
                    href={`https://wa.me/${CASA_WHATSAPP}?text=${encodeURIComponent(`Hi! I'm interested in "${property.title}" in ${property.city} (€${property.price}/mo). Can you tell me more about availability?`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleWhatsAppClick}
                    className="w-full flex items-center justify-center gap-2.5 bg-[#25D366] hover:bg-[#1ebe5d] text-white font-semibold py-3.5 rounded-xl transition-colors mb-3 text-sm"
                  >
                    <WhatsAppIcon />
                    Chat on WhatsApp
                  </a>

                  <a
                    href={`mailto:${CASA_EMAIL}?subject=${encodeURIComponent(`Enquiry: ${property.title}`)}&body=${encodeURIComponent(`Hi Casa,\n\nI'm interested in ${property.title} in ${property.city}.\n\nCould you share more details about availability and viewing?\n\nThanks`)}`}
                    className="w-full flex items-center justify-center gap-2 border border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700 font-medium py-3 rounded-xl transition-colors text-sm"
                  >
                    <Mail className="h-4 w-4" />
                    Send an email instead
                  </a>

                  {waSent && (
                    <p className="text-xs text-green-600 text-center mt-3">Opening WhatsApp…</p>
                  )}
                </>
              )}
            </Card>
          </div>
        </div>
        {/* Location map */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Location</h2>
          <p className="text-sm text-gray-500 mb-3 flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            {property.address}
          </p>
          <div className="h-64 sm:h-80 rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
            <PropertyDetailMap
              title={property.title}
              address={property.address}
              city={property.city}
              lat={property.lat}
              lng={property.lng}
            />
          </div>
        </div>

      </div>

      {/* Mobile sticky WhatsApp bar — hidden once contact card is in view */}
      {!formVisible && property && (
        <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white border-t border-gray-200 px-4 py-3 shadow-lg">
          <a
            href={`https://wa.me/${CASA_WHATSAPP}?text=${encodeURIComponent(`Hi! I'm interested in "${property.title}" in ${property.city} (€${property.price}/mo). Can you tell me more?`)}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleWhatsAppClick}
            className="w-full flex items-center justify-center gap-2.5 bg-[#25D366] hover:bg-[#1ebe5d] text-white font-semibold py-3 rounded-xl transition-colors text-sm"
          >
            <WhatsAppIcon />
            Chat on WhatsApp
          </a>
        </div>
      )}
    </div>
  );
}
