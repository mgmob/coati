import { type HTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-xl border border-gray-100 bg-white text-gray-950 shadow-sm",
        className
      )}
      {...props}
    />
  )
);
Card.displayName = "Card";