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
  coldRent?: number;
  utilityEstimate?: number;
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

export type LandlordStatus = 'none' | 'pending' | 'approved' | 'rejected';
export type LandlordType   = 'private' | 'manager';

export interface LandlordApplication {
  uid: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  landlordType: LandlordType;
  propertiesCount: string;
  cities: string;
  propertyDescription: string;
  videoCallDate: string;
  videoCallTime: string;
  notes: string;
  status: LandlordStatus;
  appliedAt: string;
}

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
  source: '' | 'casa' | 'external';
}
