'use client';

import Link from 'next/link';
import Image from 'next/image';
import { BedDouble, Ruler } from 'lucide-react';
import type { Property } from '@/lib/unistay/types';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function fmtDate(dateStr: string) {
  if (!dateStr) return '';
  const [, month, day] = dateStr.split('-');
  return `${parseInt(day)} ${MONTHS[parseInt(month) - 1]}`;
}

interface PropertyCardProps {
  property: Property;
}

export function PropertyCard({ property }: PropertyCardProps) {
  const image = property.source === 'casa' ? property.images[0] : property.image;
  const isCasa = property.source === 'casa';
  const billsIncluded = property.features.includes('bills');
  const availNow = !property.availableFrom || new Date(property.availableFrom) <= new Date();

  const inner = (
    <div className="bg-white rounded-2xl overflow-hidden border border-gray-200 hover:shadow-md transition-all duration-200 cursor-pointer group h-full flex flex-col">
      {/* Image */}
      <div className="relative h-44 overflow-hidden shrink-0">
        {image ? (
          <Image
            src={image}
            alt={property.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
            <span className="text-gray-400 text-xs">No image</span>
          </div>
        )}
        {isCasa ? (
          <span className="absolute top-3 left-3 bg-blue-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide shadow">
            Casa
          </span>
        ) : (
          <span className="absolute top-3 left-3 bg-gray-700/80 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide shadow backdrop-blur-sm">
            Partner
          </span>
        )}
        <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-black/20 to-transparent" />
      </div>

      {/* Content */}
      <div className="p-3.5 flex flex-col flex-1">
        <h3 className="font-semibold text-sm text-gray-900 leading-snug line-clamp-1 mb-0.5">
          {property.title}
        </h3>
        <p className="text-xs text-gray-400 mb-2.5 line-clamp-1">
          {[property.address, property.city].filter(Boolean).join(', ')}
        </p>

        {/* Stats */}
        <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
          {property.size > 0 && (
            <span className="flex items-center gap-1">
              <Ruler className="h-3 w-3 shrink-0" />
              {property.size} m²
            </span>
          )}
          <span className="flex items-center gap-1">
            <BedDouble className="h-3 w-3 shrink-0" />
            {property.bedrooms === 0 ? 'Studio' : `${property.bedrooms} bed`}
          </span>
        </div>

        {/* Price + availability */}
        <div className="mt-auto flex items-end justify-between gap-2">
          <div>
            <div className="flex items-baseline gap-0.5">
              <span className="font-bold text-base text-gray-900">€{property.price.toLocaleString()}</span>
              <span className="text-xs text-gray-400">/month</span>
            </div>
            {billsIncluded && (
              <p className="text-[10px] text-gray-400 mt-0.5">incl. utilities</p>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0" suppressHydrationWarning>
            <span className={`w-1.5 h-1.5 rounded-full ${availNow ? 'bg-green-500' : 'bg-gray-300'}`} suppressHydrationWarning />
            <span className="text-xs text-gray-600" suppressHydrationWarning>
              {availNow ? 'Available now' : `From ${fmtDate(property.availableFrom)}`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  if (isCasa) {
    return <Link href={`/unistay/properties/${property.id}`} className="block h-full">{inner}</Link>;
  }
  return (
    <a
      href={(property as { externalUrl: string }).externalUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="block h-full"
    >
      {inner}
    </a>
  );
}
