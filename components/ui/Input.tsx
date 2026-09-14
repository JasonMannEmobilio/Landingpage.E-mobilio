import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', hasError, ...props }, ref) => {
    return (
      <input
        ref={ref}
        aria-invalid={hasError || undefined}
        className={[
          'w-full rounded-lg border bg-white px-3.5 py-2.5 text-[15px] text-gray-900',
          'placeholder:text-gray-400 transition-colors',
          'focus:outline-none focus-visible:outline-none',
          hasError
            ? 'border-red-500 focus:border-red-500'
            : 'border-gray-300 hover:border-gray-400 focus:border-[var(--color-primary)]',
          className,
        ].join(' ')}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';
