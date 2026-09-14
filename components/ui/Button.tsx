import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  loadingText?: string;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', isLoading, loadingText = 'Wird gesendet…', children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={isLoading || disabled}
        aria-busy={isLoading || undefined}
        className={[
          'inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3',
          'text-[15px] font-semibold transition-all',
          'hover:brightness-95 active:brightness-90 active:scale-[0.995]',
          'disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:brightness-100',
          className,
        ].join(' ')}
        style={{
          backgroundColor: 'var(--color-button)',
          color: 'var(--color-button-text)',
        }}
        {...props}
      >
        {isLoading && (
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        )}
        {isLoading ? loadingText : children}
      </button>
    );
  }
);
Button.displayName = 'Button';
