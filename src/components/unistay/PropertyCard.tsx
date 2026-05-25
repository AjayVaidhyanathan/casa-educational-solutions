'use client';

import Link from 'next/link';
import Image from 'next/image';
import { MapPin, BedDouble, Ruler, Calendar, ExternalLink, ArrowRight } from 'lucide-react';
import { Button } from '@/components/unistay/ui/button';
import { Card } from '@/components/unistay/ui/card';
import type { Property } from '@/lib/unistay/types';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function formatAvailableDate(dateStr: string) {
  const [year, month, day] = dateStr.split('-');
  return `${parseInt(day)} ${MONTHS[parseInt(month) - 1]} ${year}`;
}

const FEATURE_LABELS: Record<string, string> = {
  furnished: 'Furnished',
  wifi: 'WiFi',
  bills: 'Bills incl.',
  parking: 'Parking',
  balcony: 'Balcony',
};

interface PropertyCardProps {
  property: Property;
}

export function PropertyCard({ property }: PropertyCardProps) {
  const image = property.source === 'casa' ? property.images[0] : property.image;
  const isCasa = property.source === 'casa';

  return (
    <Card className="overflow-hidden flex flex-col hover:shadow-md transition-shadow">
      {/* Image */}
      <div className="relative h-52">
        <Image src={image} alt={property.title} fill className="object-cover" />

        {/* Source badge */}
        <div className="absolute top-3 left-3">
          {isCasa ? (
            <span className="inline-flex items-center gap-1 bg-blue-600 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 bg-white rounded-full" />
              Casa Managed
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 bg-gray-800 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
              HousingAnywhere
            </span>
          )}
        </div>

        {/* Price */}
        <div className="absolute bottom-3 right-3 bg-white rounded-lg px-3 py-1.5 shadow">
          <span className="text-lg font-bold text-gray-900">€{property.price.toLocaleString()}</span>
          <span className="text-xs text-gray-500">/mo</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-semibold text-gray-900 mb-1 leading-snug">{property.title}</h3>

        <p className="text-sm text-gray-500 flex items-center gap-1 mb-3">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          {property.address}
        </p>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
          <span className="flex items-center gap-1">
            <BedDouble className="h-4 w-4 text-gray-400" />
            {property.bedrooms} bed
          </span>
          <span className="flex items-center gap-1">
            <Ruler className="h-4 w-4 text-gray-400" />
            {property.size}m²
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4 text-gray-400" />
            {formatAvailableDate(property.availableFrom)}
          </span>
        </div>

        {/* Feature tags */}
        {property.features.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {property.features.slice(0, 3).map((f) => (
              <span key={f} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {FEATURE_LABELS[f] ?? f}
              </span>
            ))}
            {property.features.length > 3 && (
              <span className="text-xs text-gray-400">+{property.features.length - 3} more</span>
            )}
          </div>
        )}

        {/* CTA */}
        <div className="mt-auto">
          {isCasa ? (
            <Link href={`/unistay/properties/${property.id}`} className="block">
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                View Details
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          ) : (
            <a href={property.externalUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="w-full border-gray-300 text-gray-700 hover:border-blue-500 hover:text-blue-600">
                View on HousingAnywhere
                <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
            </a>
          )}
        </div>
      </div>
    </Card>
  );
}
