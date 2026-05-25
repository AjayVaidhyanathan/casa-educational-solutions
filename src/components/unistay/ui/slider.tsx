'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/unistay/utils';

interface PriceSliderProps {
  min: number;
  max: number;
  step?: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  formatValue?: (v: number) => string;
  className?: string;
}

export function PriceSlider({
  min,
  max,
  step = 50,
  value,
  onChange,
  formatValue = (v) => `€${v.toLocaleString()}`,
  className,
}: PriceSliderProps) {
  const [lower, upper] = value;
  const trackRef = useRef<HTMLDivElement>(null);

  const lowerPct = ((lower - min) / (max - min)) * 100;
  const upperPct = ((upper - min) / (max - min)) * 100;

  const handleLower = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = Math.min(Number(e.target.value), upper - step);
      onChange([v, upper]);
    },
    [upper, step, onChange]
  );

  const handleUpper = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = Math.max(Number(e.target.value), lower + step);
      onChange([lower, v]);
    },
    [lower, step, onChange]
  );

  return (
    <div className={cn('w-full', className)}>
      <div className="flex justify-between mb-3">
        <span className="text-sm font-semibold text-blue-600">{formatValue(lower)}</span>
        <span className="text-xs text-gray-400 self-center">to</span>
        <span className="text-sm font-semibold text-blue-600">{formatValue(upper)}</span>
      </div>

      {/* Track */}
      <div ref={trackRef} className="relative h-2 w-full">
        {/* Base track */}
        <div className="absolute inset-0 rounded-full bg-gray-200" />
        {/* Filled range */}
        <div
          className="absolute h-full rounded-full bg-blue-600"
          style={{ left: `${lowerPct}%`, right: `${100 - upperPct}%` }}
        />

        {/* Lower thumb input */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={lower}
          onChange={handleLower}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          style={{ zIndex: lower > max - step ? 5 : 3 }}
        />
        {/* Upper thumb input */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={upper}
          onChange={handleUpper}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          style={{ zIndex: 4 }}
        />

        {/* Visual thumb — lower */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-white border-2 border-blue-600 shadow pointer-events-none"
          style={{ left: `${lowerPct}%`, zIndex: 6 }}
        />
        {/* Visual thumb — upper */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-white border-2 border-blue-600 shadow pointer-events-none"
          style={{ left: `${upperPct}%`, zIndex: 6 }}
        />
      </div>

      <div className="flex justify-between mt-1">
        <span className="text-xs text-gray-400">{formatValue(min)}</span>
        <span className="text-xs text-gray-400">{formatValue(max)}</span>
      </div>
    </div>
  );
}
