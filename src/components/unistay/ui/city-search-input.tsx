'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';

const POPULAR_CITIES = ['Berlin', 'Munich', 'Hamburg', 'Frankfurt', 'Cologne', 'Stuttgart'];

function fuzzyMatch(query: string, city: string): boolean {
  const q = query.toLowerCase();
  const c = city.toLowerCase();
  if (c.includes(q)) return true;
  let qi = 0;
  for (const ch of c) {
    if (ch === q[qi]) qi++;
    if (qi === q.length) return true;
  }
  return false;
}

interface CitySearchInputProps {
  cities: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputClassName?: string;
}

export function CitySearchInput({
  cities,
  value,
  onChange,
  placeholder = 'Search city…',
  inputClassName,
}: CitySearchInputProps) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value); // eslint-disable-line react-hooks/set-state-in-effect
  }, [value]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        if (!cities.includes(query)) setQuery(value);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [cities, query, value]);

  const suggestions = query.trim().length >= 1
    ? cities.filter((c) => fuzzyMatch(query, c)).slice(0, 8)
    : [];

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setQuery(q);
    setOpen(q.trim().length > 0);
    if (q === '') onChange('');
  }

  function select(city: string) {
    setQuery(city);
    onChange(city);
    setOpen(false);
  }

  function clear() {
    setQuery('');
    onChange('');
    setOpen(false);
    inputRef.current?.focus();
  }

  return (
    <div ref={containerRef} className="space-y-2.5">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => { if (query.trim().length > 0) setOpen(true); }}
          placeholder={placeholder}
          className={
            inputClassName ??
            'w-full h-12 rounded-md border border-gray-300 pl-9 pr-9 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
          }
        />
        {query && (
          <button
            type="button"
            onClick={clear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {open && suggestions.length > 0 && (
          <div className="absolute z-50 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg max-h-52 overflow-auto">
            {suggestions.map((city) => (
              <div
                key={city}
                onMouseDown={(e) => { e.preventDefault(); select(city); }}
                className={`px-4 py-2.5 text-sm cursor-pointer transition-colors ${
                  city === value
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                {city}
              </div>
            ))}
          </div>
        )}
      </div>

      {!value && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-gray-400 shrink-0">Popular:</span>
          {POPULAR_CITIES.map((c) => (
            <button
              key={c}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); select(c); }}
              className="px-2.5 py-1 text-xs rounded-full border border-gray-200 bg-white text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
            >
              {c}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
