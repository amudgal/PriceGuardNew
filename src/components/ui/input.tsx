import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          'h-10 w-full rounded-md border border-[#D1D5DB] bg-white px-3 text-base text-[#374151] placeholder:text-[#9CA3AF] transition-all duration-150 ease-in-out focus:border-[#E91E8C] focus:ring-2 focus:ring-[#E91E8C33] focus:ring-offset-0 disabled:cursor-not-allowed disabled:bg-[#F9FAFB] disabled:text-[#9CA3AF]',
          className,
        )}
        {...props}
      />
    );
  },
);

Input.displayName = 'Input';

