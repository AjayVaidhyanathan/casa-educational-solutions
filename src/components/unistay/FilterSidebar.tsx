'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/unistay/ui/select';
import { PriceSlider } from '@/components/unistay/ui/slider';
import { Combobox } from '@/components/unistay/ui/combobox';
import type { FilterValues } from '@/lib/unistay/types';

const CITIES = [
  { value: 'Berlin', label: 'Berlin' },
  { value: 'Munich', label: 'Munich' },
  { value: 'Hamburg', label: 'Hamburg' },
  { value: 'Frankfurt', label: 'Frankfurt' },
  { value: 'Cologne', label: 'Cologne' },
  { value: 'Stuttgart', label: 'Stuttgart' },
  { value: 'Dusseldorf', label: 'Düsseldorf' },
  { value: 'Leipzig', label: 'Leipzig' },
  { value: 'Dresden', label: 'Dresden' },
  { value: 'Nuremberg', label: 'Nuremberg' },
];

const BEDROOM_OPTIONS = ['Any', '1', '2', '3+'];

const FEATURES = [
  { id: 'furnished', label: 'Furnished' },
  { id: 'wifi', label: 'WiFi included' },
  { id: 'bills', label: 'Bills included' },
  { id: 'parking', label: 'Parking' },
  { id: 'balcony', label: 'Balcony' },
];

interface FilterSidebarProps {
  filters: FilterValues;
  onChange: (filters: FilterValues) => void;
  onClear: () => void;
  activeCount: number;
}

export function FilterSidebar({ filters, onChange, onClear, activeCount }: FilterSidebarProps) {
  const [today, setToday] = useState('');
  useEffect(() => { setToday(new Date().toISOString().split('T')[0]); }, []); // eslint-disable-line react-hooks/set-state-in-effect

  function set<K extends keyof FilterValues>(key: K, value: FilterValues[K]) {
    onChange({ ...filters, [key]: value });
  }

  function toggleFeature(id: string) {
    const next = filters.features.includes(id)
      ? filters.features.filter((f) => f !== id)
      : [...filters.features, id];
    set('features', next);
  }

  return (
    <aside className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">Filters</h2>
        {activeCount > 0 && (
          <button
            onClick={onClear}
            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
          >
            <X className="h-3.5 w-3.5" />
            Clear all ({activeCount})
          </button>
        )}
      </div>

      {/* City */}
      <div>
        <label className="text-xs font-medium text-gray-500 mb-2 block uppercase tracking-wide">Location</label>
        <Combobox
          options={CITIES}
          value={filters.city}
          onChange={(v) => set('city', v)}
          placeholder="Any city"
        />
      </div>

      {/* Property Type */}
      <div>
        <label className="text-xs font-medium text-gray-500 mb-2 block uppercase tracking-wide">Property Type</label>
        <Select value={filters.type || 'all'} onValueChange={(v) => set('type', v === 'all' ? '' : v)}>
          <SelectTrigger className="border-gray-300">
            <SelectValue placeholder="Any type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any type</SelectItem>
            <SelectItem value="studio">Studio</SelectItem>
            <SelectItem value="apartment">Apartment</SelectItem>
            <SelectItem value="room">Private Room</SelectItem>
            <SelectItem value="shared">Shared Room</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Price */}
      <div>
        <label className="text-xs font-medium text-gray-500 mb-3 block uppercase tracking-wide">Monthly Rent</label>
        <PriceSlider
          min={0}
          max={3000}
          step={50}
          value={[filters.minPrice, filters.maxPrice]}
          onChange={([min, max]) => onChange({ ...filters, minPrice: min, maxPrice: max })}
        />
      </div>

      {/* Move-in / Move-out */}
      <div className="space-y-3">
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block">Dates</label>
        <div>
          <p className="text-xs text-gray-400 mb-1">Move-in</p>
          <input
            type="date"
            value={filters.dateFrom}
            min={today}
            onChange={(e) => {
              set('dateFrom', e.target.value);
              if (filters.dateTo && e.target.value > filters.dateTo) set('dateTo', '');
            }}
            className="w-full h-10 rounded-md border border-gray-300 px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">Move-out</p>
          <input
            type="date"
            value={filters.dateTo}
            min={filters.dateFrom || new Date().toISOString().split('T')[0]}
            onChange={(e) => set('dateTo', e.target.value)}
            className="w-full h-10 rounded-md border border-gray-300 px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Bedrooms */}
      <div>
        <label className="text-xs font-medium text-gray-500 mb-2 block uppercase tracking-wide">Bedrooms</label>
        <div className="flex gap-2">
          {BEDROOM_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => set('bedrooms', opt === 'Any' ? 'all' : opt)}
              className={`flex-1 h-9 rounded-md border text-sm font-medium transition-colors ${
                (opt === 'Any' && (filters.bedrooms === 'all' || !filters.bedrooms)) ||
                filters.bedrooms === opt
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
        <label className="text-xs font-medium text-gray-500 mb-2 block uppercase tracking-wide">Features</label>
        <div className="space-y-2">
          {FEATURES.map(({ id, label }) => {
            const active = filters.features.includes(id);
            return (
              <label key={id} className="flex items-center gap-2.5 cursor-pointer group">
                <div
                  onClick={() => toggleFeature(id)}
                  className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                    active ? 'bg-blue-600 border-blue-600' : 'border-gray-300 group-hover:border-blue-400'
                  }`}
                >
                  {active && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 10">
                      <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <span className="text-sm text-gray-700">{label}</span>
              </label>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
