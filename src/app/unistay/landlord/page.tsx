'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/unistay/firebase';
import { useAuth } from '@/lib/unistay/auth-context';
import { CheckCircle2, Clock, Video, Building2, ArrowRight, Shield, XCircle, Loader2 } from 'lucide-react';
import type { LandlordStatus } from '@/lib/unistay/types';

const STEPS = [
  {
    icon: Building2,
    title: 'Tell us about yourself',
    body: 'Share your landlord profile and the properties you manage.',
  },
  {
    icon: Video,
    title: 'Quick video verification',
    body: 'A short call with our team to verify your identity — no documents needed.',
  },
  {
    icon: CheckCircle2,
    title: 'Get approved & list',
    body: 'Once verified, list your properties and reach vetted international students.',
  },
];

export default function LandlordPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [landlordStatus, setLandlordStatus] = useState<LandlordStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  useEffect(() => {
    if (!user) { setLandlordStatus(null); return; }
    setStatusLoading(true);
    getDoc(doc(db, 'users', user.uid))
      .then((snap) => {
        const status = (snap.data()?.landlordStatus as LandlordStatus) ?? 'none';
        setLandlordStatus(status);
        if (status === 'approved') router.replace('/unistay/list-property');
      })
      .catch(() => setLandlordStatus('none'))
      .finally(() => setStatusLoading(false));
  }, [user, router]);

  if (authLoading || statusLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-gray-300" />
      </div>
    );
  }

  if (landlordStatus === 'pending') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <Clock className="h-8 w-8 text-amber-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Application under review</h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            We've received your landlord application. Our team will reach out to confirm your video verification call within 1–2 business days.
          </p>
          <Link href="/unistay/browse" className="mt-6 inline-flex text-sm text-blue-600 hover:underline">
            ← Back to browse
          </Link>
        </div>
      </div>
    );
  }

  if (landlordStatus === 'rejected') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <XCircle className="h-8 w-8 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Application not approved</h2>
          <p className="text-gray-400 text-sm leading-relaxed mb-6">
            Unfortunately your landlord application was not approved at this time. Please contact us if you have questions.
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-widest mb-6">
            <Shield className="h-3.5 w-3.5" /> Verified landlords only
          </div>
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight mb-4">
            List your place with ease
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed max-w-xl mx-auto">
            Casa connects verified landlords with international students. Quick video verification — no paperwork, no documents.
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
          {STEPS.map(({ icon: Icon, title, body }, i) => (
            <div key={title} className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
              <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Icon className="h-5 w-5 text-blue-500" />
              </div>
              <div className="text-xs font-bold text-blue-500 mb-2">Step {i + 1}</div>
              <h3 className="font-semibold text-gray-800 text-sm mb-1">{title}</h3>
              <p className="text-xs text-gray-400 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>

        {/* What to expect */}
        <div className="bg-white rounded-2xl border border-gray-100 p-8 mb-10">
          <h3 className="font-semibold text-gray-800 mb-4">What to expect</h3>
          <ul className="space-y-3">
            {[
              'Fill in a short form about yourself and your properties',
              'Choose a time for a 10–15 min video call with our team',
              'We verify your identity — no documents required',
              'Get approved within 1–2 business days',
              'List your property using our detailed listing form',
            ].map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-gray-500">
                <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* CTA */}
        <div className="text-center">
          {user ? (
            <Link
              href="/unistay/landlord/apply"
              className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors text-sm"
            >
              Apply to become a landlord <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-400">Create a free account to apply</p>
              <Link
                href="/unistay/register?redirect=landlord"
                className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors text-sm"
              >
                Get started <ArrowRight className="h-4 w-4" />
              </Link>
              <p className="text-xs text-gray-400 mt-2">
                Already have an account?{' '}
                <Link href="/unistay/auth?redirect=landlord" className="text-blue-600 hover:underline">Sign in</Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
