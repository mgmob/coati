import React from 'react';
import { cn } from '../../lib/utils';

export const Divider: React.FC<{ orientation?: 'horizontal' | 'vertical', className?: string }> = ({
  orientation = 'horizontal', className
}) => (
  <div className={cn(
    "bg-gray-200",
    orientation === 'horizontal' ? "h-[1px] w-full" : "h-full w-[1px]",
    className
  )} />
);