'use client';

import Link from 'next/link';

interface GlassNavProps {
  right?: React.ReactNode;
}

export function GlassNav({ right }: GlassNavProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="flex items-center justify-between px-8 h-16 max-w-[1440px] mx-auto">
        <Link href="/">
          <img src="/casa-logo.png" alt="Casa" className="h-8 w-auto" />
        </Link>
        {right && (
          <div className="flex items-center gap-6">{right}</div>
        )}
      </div>
    </header>
  );
}
