import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/cn';

interface ScrollAreaProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  orientation?: 'vertical' | 'horizontal' | 'both';
}

export function ScrollArea({ children, className, orientation = 'vertical', ...props }: ScrollAreaProps) {
  const overflowClass =
    orientation === 'horizontal'
      ? 'overflow-x-auto overflow-y-hidden'
      : orientation === 'both'
        ? 'overflow-auto'
        : 'overflow-y-auto overflow-x-hidden';

  return (
    <div className={cn('w-full', overflowClass, className)} {...props}>
      {children}
    </div>
  );
}
