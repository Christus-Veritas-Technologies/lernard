import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/cn';

interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

interface AvatarFallbackProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
}

export function Avatar({ children, className, ...props }: AvatarProps) {
  return (
    <div
      className={cn(
        'relative inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-100',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function AvatarFallback({ children, className, ...props }: AvatarFallbackProps) {
  return (
    <span className={cn('text-sm font-semibold text-primary-600', className)} {...props}>
      {children}
    </span>
  );
}
