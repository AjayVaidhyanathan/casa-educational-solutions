'use client';

import { usePathname } from 'next/navigation';

export default function AdminShellCheck({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith('/unistay/admin')) return null;
  return <>{children}</>;
}
