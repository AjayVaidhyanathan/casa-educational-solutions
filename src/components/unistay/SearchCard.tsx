'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/unistay/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/unistay/ui/select';
import { Card } from '@/components/unistay/ui/card';
import { PriceSlider } from '@/components/unistay/ui/slider';
import { CitySearchInput } from '@/components/unistay/ui/city-search-input';

const BEDROOM_OPTIONS = ['Any', '1', '2', '3+'];

const FEATURES = [
  { id: 'furnished', label: 'Furnished' },
  { id: 'wifi', label: 'WiFi included' },
  { id: 'bills', label: 'Bills included' },
  { id: 'parking', label: 'Parking' },
  { id: 'balcony', label: 'Balcony' },
];

function tomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

function firstOfNextMonth(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1, 1);
  return d.toISOString().split('T')[0];
}

export function SearchCard() {
  const router = useRouter();
  const [propertyType, setPropertyType] = useState('');
  const [city, setCity] = useState('');
  const [cities, setCities] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 3000]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [bedrooms, setBedrooms] = useState('Any');
  const [features, setFeatures] = useState<string[]>([]);
  const [today, setToday] = useState('');

  useEffect(() => {
    setToday(new Date().toISOString().split('T')[0]); // eslint-disable-line react-hooks/set-state-in-effect
    setStartDate(tomorrow()); // eslint-disable-line react-hooks/set-state-in-effect
    setEndDate(firstOfNextMonth()); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);

  useEffect(() => {
    fetch('/api/unistay/cities')
      .then((r) => r.json())
      .then((data: string[]) => setCities(data)) // eslint-disable-line react-hooks/set-state-in-effect
      .catch(() => {});
  }, []);

  function toggleFeature(id: string) {
    setFeatures((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  }

  function handleSearch() {
    const params = new URLSearchParams();
    if (propertyType) params.set('type', propertyType);
    if (city) params.set('city', city);
    params.set('minPrice', String(priceRange[0]));
    params.set('maxPrice', String(priceRange[1]));
    if (startDate) params.set('from', startDate);
    if (endDate) params.set('to', endDate);
    if (bedrooms !== 'Any') params.set('bedrooms', bedrooms);
    if (features.length) params.set('features', features.join(','));
    router.push(`/unistay/search?${params.toString()}`);
  }

  return (
    <Card className="w-full lg:w-[440px] p-6 bg-white shadow-2xl">
      <h2 className="text-xl font-semibold mb-5 pb-4 border-b">Find your flat</h2>

      <div className="space-y-4">
        {/* Location — searchable dropdown */}
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1.5 block uppercase tracking-wide">
            Location
          </label>
          <CitySearchInput
            cities={cities}
            value={city}
            onChange={setCity}
            placeholder="Search city…"
          />
        </div>

        {/* Property Type */}
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1.5 block uppercase tracking-wide">
            Property Type
          </label>
          <Select value={propertyType} onValueChange={setPropertyType}>
            <SelectTrigger className="h-12 border-gray-300">
              <SelectValue placeholder="Any type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="studio">Studio</SelectItem>
              <SelectItem value="apartment">Apartment</SelectItem>
              <SelectItem value="room">Private Room</SelectItem>
              <SelectItem value="shared">Shared Room</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Price Range Slider */}
        <div>
          <label className="text-xs font-medium text-gray-500 mb-3 block uppercase tracking-wide">
            Monthly Rent
          </label>
          <PriceSlider
            min={0}
            max={3000}
            step={50}
            value={priceRange}
            onChange={setPriceRange}
          />
        </div>

        {/* Move-in / Move-out Dates */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block uppercase tracking-wide">
              Move-in
            </label>
            <input
              type="date"
              value={startDate}
              min={today}
              onChange={(e) => {
                setStartDate(e.target.value);
                if (endDate && e.target.value > endDate) setEndDate('');
              }}
              className="w-full h-12 rounded-md border border-gray-300 px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block uppercase tracking-wide">
              Move-out
            </label>
            <input
              type="date"
              value={endDate}
              min={startDate || new Date().toISOString().split('T')[0]}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full h-12 rounded-md border border-gray-300 px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Advanced Toggle */}
        <button
          type="button"
          onClick={() => setShowAdvanced((p) => !p)}
          className="w-full text-left py-1 flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors"
        >
          {showAdvanced ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
          {showAdvanced ? 'Hide advanced filters' : 'Advanced filters'}
        </button>

        {/* Advanced Panel */}
        {showAdvanced && (
          <div className="space-y-4 pt-2 border-t border-gray-100">
            {/* Bedrooms */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-2 block uppercase tracking-wide">
                Bedrooms
              </label>
              <div className="flex gap-2">
                {BEDROOM_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setBedrooms(opt)}
                    className={`flex-1 h-9 rounded-md border text-sm font-medium transition-colors ${
                      bedrooms === opt
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-gray-300 text-gray-700 hover:border-blue-400'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* Features */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-2 block uppercase tracking-wide">
                Features
              </label>
              <div className="flex flex-wrap gap-2">
                {FEATURES.map(({ id, label }) => {
                  const active = features.includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => toggleFeature(id)}
                      className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-colors ${
                        active
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-gray-300 text-gray-600 hover:border-blue-400'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Search Button */}
        <Button
          onClick={handleSearch}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-base mt-1"
        >
          <Search className="h-5 w-5 mr-2" />
          Search
        </Button>
      </div>
    </Card>
  );
}
