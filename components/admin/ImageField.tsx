"use client";

import React, { useRef, useState } from 'react';

interface ImageFieldProps {
  label: string;
  id: string;
  /** Path fallback shown when nothing is uploaded, e.g. /logos/slug.svg */
  placeholder: string;
  /** Which public folder the file belongs in. */
  kind: 'logo' | 'card';
  /** Used to name the stored file. */
  slug: string;
  value: string | Record<string, unknown> | '';
  onChange: (value: string | Record<string, unknown> | '') => void;
}

/**
 * Accepts either an uploaded file (forwarded to Xano) or a plain path to an asset
 * already sitting in public/. Falls back to path-only if no upload endpoint exists.
 */
export function ImageField({ label, id, placeholder, kind, slug, value, onChange }: ImageFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const uploadedName =
    value && typeof value === 'object' ? String((value as { name?: string }).name ?? 'Datei') : null;

  const onFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsUploading(true);

    try {
      const body = new FormData();
      body.append('file', file);
      body.append('kind', kind);
      body.append('slug', slug);

      const response = await fetch('/api/admin/upload', { method: 'POST', body });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(
          response.status === 501
            ? 'Upload ist nicht konfiguriert — bitte Pfad eintragen.'
            : result.error ?? 'Upload fehlgeschlagen.'
        );
        return;
      }

      onChange(result.file);
      setPreview(URL.createObjectURL(file));
    } catch {
      setError('Upload fehlgeschlagen.');
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-gray-700">
        {label}
      </label>

      <div className="flex items-center gap-2">
        {preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="h-9 w-14 shrink-0 rounded border border-gray-200 object-contain p-0.5" />
        )}

        <input
          id={id}
          type="text"
          value={uploadedName ?? (typeof value === 'string' ? value : '')}
          readOnly={Boolean(uploadedName)}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 read-only:bg-gray-50 read-only:text-gray-600 focus:border-gray-900 focus:outline-none"
        />

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          className="shrink-0 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
        >
          {isUploading ? 'Lädt…' : 'Hochladen'}
        </button>

        {uploadedName && (
          <button
            type="button"
            onClick={() => { onChange(''); setPreview(null); }}
            className="shrink-0 rounded-lg px-2 py-2 text-sm text-gray-400 transition-colors hover:text-red-600"
            title="Entfernen"
          >
            ✕
          </button>
        )}
      </div>

      <input ref={inputRef} type="file" accept="image/*" onChange={onFile} className="hidden" />

      {error ? (
        <p className="mt-1 text-xs font-medium text-red-600">{error}</p>
      ) : (
        <p className="mt-1 text-xs text-gray-500">
          {uploadedName ? 'Wird nach Xano hochgeladen' : `leer lassen für ${placeholder}`}
        </p>
      )}
    </div>
  );
}
