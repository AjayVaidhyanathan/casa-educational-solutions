'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/unistay/firebase';
import { Shield, Loader2, LayoutList, Users, MessageSquare, LogOut, Building2 } from 'lucide-react';
import Link from 'next/link';

const TABS = [
  { href: '/unistay/admin/listings',   label: 'Listings',   icon: LayoutList    },
  { href: '/unistay/admin/candidates', label: 'Candidates', icon: Users         },
  { href: '/unistay/admin/landlords',  label: 'Landlords',  icon: Building2     },
  { href: '/unistay/admin/enquiries',  label: 'Enquiries',  icon: MessageSquare },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();

  // Let the login page render without any auth wrapper
  if (pathname === '/unistay/admin/login') {
    return <>{children}</>;
  }

  return <AdminShell pathname={pathname} router={router}>{children}</AdminShell>;
}

function AdminShell({
  children,
  pathname,
  router,
}: {
  children: React.ReactNode;
  pathname: string;
  router: ReturnType<typeof useRouter>;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const auth = sessionStorage.getItem('casa_admin');
    if (auth === 'true') {
      setReady(true);
    } else {
      router.replace('/unistay/admin/login');
    }
  }, [router]);

  async function handleSignOut() {
    sessionStorage.removeItem('casa_admin');
    try { await signOut(auth); } catch { /* ignore */ }
    router.replace('/unistay/admin/login');
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Shield className="h-4 w-4 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Casa Admin</h1>
            </div>
            <p className="text-gray-400 text-sm ml-11">Manage listings and review candidate applications</p>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600 transition-colors px-3 py-2 rounded-xl hover:bg-white border border-transparent hover:border-gray-200"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>

        {/* Tab nav */}
        <div className="flex gap-1 mb-6 bg-white border border-gray-200 rounded-xl p-1 w-fit">
          {TABS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </div>

        {children}
      </div>
    </div>
  );
}
