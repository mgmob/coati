import React from 'react';
import { cn } from '../../lib/utils';

interface BadgeProps {
  variant?: 'success' | 'warning' | 'error' | 'neutral' | 'info';
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ variant = 'neutral', children, className }) => {
  const variants = {
    success: "bg-green-100 text-green-700 border-green-200",
    warning: "bg-orange-100 text-orange-700 border-orange-200",
    error: "bg-red-100 text-red-700 border-red-200",
    neutral: "bg-gray-100 text-gray-600 border-gray-200",
    info: "bg-blue-100 text-blue-700 border-blue-200",
  };

  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors", variants[variant], className)}>
      {children}
    </span>
  );
};