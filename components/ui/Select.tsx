import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  hasError?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = '', hasError, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        aria-invalid={hasError || undefined}
        className={[
          'w-full appearance-none rounded-lg border bg-white px-3.5 py-2.5 text-[15px] text-gray-900',
          'transition-colors focus:outline-none focus-visible:outline-none',
          // Room for the chevron drawn below.
          'bg-[length:18px] bg-[right_0.85rem_center] bg-no-repeat pr-10',
          hasError
            ? 'border-red-500'
            : 'border-gray-300 hover:border-gray-400 focus:border-[var(--color-primary)]',
          className,
        ].join(' ')}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E\")",
        }}
        {...props}
      >
        {children}
      </select>
    );
  }
);
Select.displayName = 'Select';
