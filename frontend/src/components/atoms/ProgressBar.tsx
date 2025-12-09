import React from 'react';
import { cn } from '../../lib/utils';

export const ProgressBar: React.FC<{ value: number, max?: number, className?: string }> = ({
  value, max = 100, className
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  let colorClass = "bg-blue-600";
  if (percentage > 80) colorClass = "bg-orange-500";
  if (percentage > 95) colorClass = "bg-red-500";

  return (
    <div className={cn("h-2 w-full bg-gray-100 rounded-full overflow-hidden", className)}>
      <div
        className={cn("h-full transition-all duration-300 ease-in-out", colorClass)}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};