"use client";

import React from 'react';

interface ColorFieldProps {
  label: string;
  id: string;
  value: string;
  fallback: string;
  onChange: (value: string) => void;
  hint?: string;
}

export const isValidHex = (v: string) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v);

/** "1a2b5f" -> "#1a2b5f"; leaves anything already valid alone. */
function normalize(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
}

/**
 * Colour input with a real swatch. Typing a hex and picking from the OS colour
 * picker both work, and stay in sync.
 */
export function ColorField({ label, id, value, fallback, onChange, hint }: ColorFieldProps) {
  const effective = isValidHex(value) ? value : fallback;
  const invalid = value !== '' && !isValidHex(value);

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-gray-700">
        {label}
      </label>

      <div
        className={[
          'flex items-center gap-2 rounded-lg border bg-white p-1.5 transition-colors',
          invalid ? 'border-red-500' : 'border-gray-300 focus-within:border-gray-900',
        ].join(' ')}
      >
        <label
          className="relative h-8 w-8 shrink-0 cursor-pointer overflow-hidden rounded-md ring-1 ring-inset ring-black/10"
          style={{ backgroundColor: effective }}
          title="Farbe wählen"
        >
          <input
            type="color"
            value={effective}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
            tabIndex={-1}
            aria-label={`${label} auswählen`}
          />
        </label>

        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={(e) => onChange(normalize(e.target.value))}
          placeholder={fallback}
          spellCheck={false}
          className="w-full border-0 bg-transparent px-1 py-1 font-mono text-sm uppercase text-gray-900 placeholder:normal-case placeholder:font-sans placeholder:text-gray-400 focus:outline-none"
        />
      </div>

      {invalid ? (
        <p className="mt-1 text-xs font-medium text-red-600">Bitte einen Hex-Wert wie #1a2b5f eingeben.</p>
      ) : (
        hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>
      )}
    </div>
  );
}
