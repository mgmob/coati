import React from 'react';
import { cn } from '../../lib/utils';

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export const Label: React.FC<LabelProps> = ({ className, required, children, ...props }) => (
  <label className={cn("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-700", className)} {...props}>
    {children}
    {required && <span className="text-red-500 ml-1">*</span>}
  </label>
);