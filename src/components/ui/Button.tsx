import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: ReactNode;
}

const variants = {
  primary:   'bg-cyan-400 hover:bg-cyan-300 text-black font-semibold',
  secondary: 'bg-transparent border border-white/[.12] text-slate-200 hover:border-white/[.22] hover:bg-white/[.04]',
  danger:    'bg-transparent border border-red-500/40 text-red-400 hover:bg-red-500/10 hover:border-red-500/60',
  ghost:     'bg-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[.05]',
};

const sizes = {
  sm: 'px-3 py-1.5 text-[13px]',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-[15px]',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  className = '',
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        ${variants[variant]} ${sizes[size]}
        rounded-lg font-medium tracking-tight transition-all duration-150
        disabled:opacity-40 disabled:cursor-not-allowed
        flex items-center justify-center gap-2
        ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4 flex-shrink-0" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  );
}
