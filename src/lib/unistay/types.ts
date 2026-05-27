export type PropertySource = 'casa' | 'housinganywhere';
export type PropertyType = 'studio' | 'apartment' | 'room' | 'shared';

export interface CasaProperty {
  source: 'casa';
  id: string;
  title: string;
  type: PropertyType;
  city: string;
  address: string;
  price: number;
  bedrooms: number;
  size: number;
  availableFrom: string;
  images: string[];
  features: string[];
  description: string;
  featured?: boolean;
  lat?: number;
  lng?: number;
}

export interface ExternalProperty {
  source: 'housinganywhere';
  id: string;
  title: string;
  type: PropertyType;
  city: string;
  address: string;
  price: number;
  bedrooms: number;
  size: number;
  availableFrom: string;
  image: string;
  features: string[];
  externalUrl: string;
  lat?: number;
  lng?: number;
}

export type Property = CasaProperty | ExternalProperty;

export interface FilterValues {
  search: string;
  type: string;
  city: string;
  minPrice: number;
  maxPrice: number;
  bedrooms: string;
  features: string[];
  dateFrom: string;
  dateTo: string;
}
