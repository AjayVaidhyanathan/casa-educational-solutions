'use client';

import React from 'react';

// ─── Label ───────────────────────────────────────────────────────────────────

export function FieldLabel({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2 block ${className}`}>
      {children}
    </label>
  );
}

// ─── Input ───────────────────────────────────────────────────────────────────

type SoftInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  icon?: React.ElementType;
};

export function SoftInput({ icon: Icon, disabled, className = '', ...props }: SoftInputProps) {
  const active = !disabled;
  return (
    <div className="relative">
      {Icon && !disabled && (
        <Icon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300 pointer-events-none" />
      )}
      <input
        disabled={disabled}
        className={`w-full text-sm transition-all ${
          active
            ? `bg-gray-50 border border-gray-200 rounded-xl py-4 text-gray-800 placeholder:text-gray-300
               focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
               ${Icon ? 'pl-11 pr-5' : 'px-5'}`
            : 'bg-transparent border-0 px-0 py-0.5 text-gray-700 cursor-default focus:outline-none'
        } ${className}`}
        {...props}
      />
    </div>
  );
}

// ─── Textarea ─────────────────────────────────────────────────────────────────

type SoftTextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export function SoftTextarea({ disabled, className = '', ...props }: SoftTextareaProps) {
  const active = !disabled;
  return (
    <textarea
      disabled={disabled}
      className={`w-full text-sm transition-all resize-none ${
        active
          ? 'bg-gray-50 border border-gray-200 rounded-xl px-5 py-4 text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
          : 'bg-transparent border-0 px-0 py-0.5 text-gray-700 cursor-default focus:outline-none'
      } ${className}`}
      {...props}
    />
  );
}

// ─── Select ──────────────────────────────────────────────────────────────────

type SoftSelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  icon?: React.ElementType;
};

export function SoftSelect({ icon: Icon, disabled, className = '', ...props }: SoftSelectProps) {
  const active = !disabled;
  return (
    <div className="relative">
      {Icon && !disabled && (
        <Icon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300 pointer-events-none" />
      )}
      <select
        disabled={disabled}
        className={`w-full text-sm transition-all appearance-none ${
          active
            ? `bg-gray-50 border border-gray-200 rounded-xl py-4 text-gray-800
               focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
               ${Icon ? 'pl-11 pr-5' : 'px-5'}`
            : 'bg-transparent border-0 px-0 py-0.5 text-gray-700 cursor-default focus:outline-none'
        } ${className}`}
        {...props}
      />
    </div>
  );
}

// ─── Buttons ─────────────────────────────────────────────────────────────────

export function PrimaryBtn({
  children,
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 hover:bg-blue-700
        text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-50 group ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function OutlineBtn({
  children,
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`flex items-center justify-center gap-2 px-6 py-4 border border-gray-200
        text-gray-500 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

// ─── FormSection card wrapper ─────────────────────────────────────────────────

export function FormSection({
  title,
  subtitle,
  children,
  className = '',
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 p-8 ${className}`}>
      <div className="mb-6">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest block">
          {title}
        </span>
        {subtitle && <p className="text-sm text-gray-400 mt-1">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
