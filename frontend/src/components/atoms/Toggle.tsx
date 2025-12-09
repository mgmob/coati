import React from 'react';
import { cn } from '../../lib/utils';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}

export const Toggle: React.FC<ToggleProps> = ({ checked, onChange, label }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className="flex items-center gap-2 group cursor-pointer"
  >
    <div className={cn(
      "w-9 h-5 rounded-full relative transition-colors duration-200 ease-in-out",
      checked ? "bg-blue-600" : "bg-gray-200"
    )}>
      <div className={cn(
        "absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ease-in-out",
        checked ? "translate-x-4" : "translate-x-0"
      )} />
    </div>
    {label && <span className="text-xs font-medium text-gray-600 group-hover:text-gray-900">{label}</span>}
  </button>
);