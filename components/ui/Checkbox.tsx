import React from 'react';

export const Checkbox = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className = '', ...props }, ref) => {
    return (
      <input
        type="checkbox"
        ref={ref}
        className={`h-[18px] w-[18px] cursor-pointer rounded border-gray-300 transition-colors ${className}`}
        style={{ accentColor: 'var(--color-primary)' }}
        {...props}
      />
    );
  }
);
Checkbox.displayName = 'Checkbox';
