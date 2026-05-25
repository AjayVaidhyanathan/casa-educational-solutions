import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumbs({ crumbs, className = 'mb-6' }: { crumbs: Crumb[]; className?: string }) {
  return (
    <nav className={`flex items-center gap-1 text-xs text-gray-400 ${className}`}>
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3 w-3 text-gray-300" />}
            {crumb.href && !isLast ? (
              <Link href={crumb.href} className="hover:text-blue-600 transition-colors">
                {crumb.label}
              </Link>
            ) : (
              <span className={isLast ? 'text-gray-700 font-medium' : ''}>{crumb.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
