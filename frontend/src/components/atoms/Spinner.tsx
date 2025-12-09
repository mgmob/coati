import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export const Spinner: React.FC<{ size?: 'sm' | 'md', className?: string }> = ({ size = 'sm', className }) => (
  <Loader2 className={cn("animate-spin text-current", size === 'sm' ? "w-4 h-4" : "w-6 h-6", className)} />
);