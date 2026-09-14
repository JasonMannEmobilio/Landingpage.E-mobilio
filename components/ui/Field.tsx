import React from 'react';

interface FieldProps {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * One label / error / required-marker treatment for every field, so the address
 * block and the SEPA block can't drift apart again.
 */
export function Field({ label, htmlFor, required, error, hint, className = '', children }: FieldProps) {
  const errorId = error ? `${htmlFor}-error` : undefined;
  const hintId = hint ? `${htmlFor}-hint` : undefined;

  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-gray-700">
        {label}
        {required && (
          <span className="ml-0.5 text-red-500" aria-hidden="true">
            *
          </span>
        )}
      </label>

      {React.isValidElement(children)
        ? React.cloneElement(children as React.ReactElement, {
            id: htmlFor,
            'aria-describedby': [errorId, hintId].filter(Boolean).join(' ') || undefined,
          })
        : children}

      {hint && !error && (
        <p id={hintId} className="mt-1 text-xs text-gray-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-1 text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
