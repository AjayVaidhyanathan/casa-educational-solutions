'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, signInWithPopup, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '@/lib/unistay/firebase';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';

export default function SignInPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  async function handleForgotPassword() {
    if (!email) { setError('Enter your email address above first.'); return; }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
      setError('');
    } catch {
      setError('Could not send reset email. Check the address and try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailSignIn(e: React.SyntheticEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const snap = await getDoc(doc(db, 'users', cred.user.uid));
      const hasProfile = snap.exists() && !!(snap.data()?.university);
      router.push(hasProfile ? '/unistay/profile' : '/unistay/register');
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError('Incorrect email or password.');
      } else if (code === 'auth/too-many-requests') {
        setError('Too many attempts. Please try again later.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setError('');
    setLoading(true);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const { uid, displayName, email: gEmail } = cred.user;
      const userRef = doc(db, 'users', uid);
      const snap = await getDoc(userRef);
      const hasProfile = snap.exists() && !!(snap.data()?.university);
      if (!snap.exists()) {
        await setDoc(userRef, {
          name:              displayName ?? '',
          email:             gEmail ?? '',
          role:              'user',
          documents:         {},
          createdAt:         new Date().toISOString(),
          applicationStatus: 'pending',
        });
      }
      router.push(hasProfile ? '/unistay/profile' : '/unistay/register');
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        // user closed popup — do nothing
      } else if (code === 'auth/popup-blocked') {
        setError('Popup was blocked. Please allow popups for this site and try again.');
      } else if (code === 'auth/unauthorized-domain') {
        setError('This domain is not authorised. Add localhost to Authorised Domains in Firebase Console.');
      } else if (code === 'auth/operation-not-allowed') {
        setError('Google sign-in is not enabled. Enable it in Firebase Console.');
      } else {
        setError(`Sign-in failed (${code || 'unknown error'}). Check the browser console for details.`);
        console.error('Google sign-in error:', err);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col bg-white" style={{ height: 'calc(100vh - var(--navbar-height))' }}>
      <main className="flex-1 flex overflow-hidden">
        {/* Left panel — photo */}
        <div className="hidden lg:block relative w-7/12 overflow-hidden">
          <Image
            src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1600"
            alt="Modern student apartment"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
          <div className="absolute bottom-16 left-16 max-w-lg z-10 text-white drop-shadow-lg">
            <h2 className="text-5xl font-bold mb-6 leading-tight tracking-tight text-white">
              Elevated living for the global student.
            </h2>
            <div className="h-1 w-20 bg-white/40 mb-6 rounded-full" />
            <p className="text-white/90 text-lg leading-relaxed">
              Carefully curated spaces across Germany, designed for students who expect more.
            </p>
          </div>
        </div>

        {/* Right panel — form */}
        <div className="w-full lg:w-5/12 flex flex-col justify-center px-8 md:px-16 lg:px-20 py-6 bg-white overflow-hidden">
          <div className="max-w-md w-full mx-auto">
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-widest block mb-2">
              Student Portal
            </span>
            <h1 className="text-4xl font-bold text-gray-900 mb-2 leading-none tracking-tight">
              Welcome back
            </h1>
            <p className="text-gray-400 mb-6 text-sm">
              Sign in to manage your stays and explore listings.
            </p>

            {error && (
              <div className="mb-6 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <form className="space-y-5" onSubmit={handleEmailSignIn}>
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2 block">
                  Email address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@university.edu"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-5 py-4 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                    Password
                  </label>
                  {resetSent
                    ? <span className="text-xs text-green-600 font-medium">Reset email sent!</span>
                    : <button type="button" onClick={handleForgotPassword} disabled={loading} className="text-xs text-blue-600 hover:underline disabled:opacity-50">Forgot password?</button>
                  }
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-5 py-4 pr-12 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-xl flex items-center justify-center gap-2 group transition-all disabled:opacity-50 mt-2"
              >
                {loading ? 'Signing in...' : 'Sign In'}
                {!loading && <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />}
              </button>
            </form>

            <div className="flex items-center my-4">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="px-4 text-xs text-gray-300 uppercase tracking-widest">or continue with</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-gray-50 border border-gray-200 rounded-xl py-4 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Google
            </button>

            <p className="text-center text-sm text-gray-400 mt-8">
              Don&apos;t have an account?{' '}
              <Link href="/unistay/register" className="text-blue-600 font-semibold hover:underline">
                Create one for free
              </Link>
            </p>

            <p className="text-center text-xs text-gray-300 mt-6 leading-relaxed">
              By continuing, you agree to UniStay&apos;s{' '}
              <span className="underline cursor-pointer hover:text-gray-400">Terms</span>{' '}
              and{' '}
              <span className="underline cursor-pointer hover:text-gray-400">Privacy Policy</span>.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
