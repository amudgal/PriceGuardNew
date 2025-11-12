import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

type ButtonVariant = 'primary' | 'ghost' | 'outline';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-[#E91E8C] text-white hover:bg-[#D11A7C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#E91E8C] focus-visible:ring-offset-white',
  ghost:
    'bg-transparent text-gray-300 hover:bg-[#2D2D2D] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#E91E8C] focus-visible:ring-offset-[#3D3D3D]',
  outline:
    'border border-[#E5E7EB] text-[#374151] hover:border-[#D1D5DB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#E91E8C] focus-visible:ring-offset-white',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex h-10 min-w-[120px] items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition-all duration-150 ease-in-out disabled:cursor-not-allowed disabled:opacity-50',
          variantStyles[variant],
          className,
        )}
        disabled={disabled}
        {...props}
      />
    );
  },
);

Button.displayName = 'Button';

