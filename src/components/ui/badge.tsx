import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-2 py-1 text-xs font-medium uppercase tracking-wide',
        className,
      )}
      {...props}
    />
  );
}

