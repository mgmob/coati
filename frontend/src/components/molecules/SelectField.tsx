import React from 'react';
import { ChevronDown } from 'lucide-react';
import { Label } from '../atoms/Label';
import { FormError, FormHelper } from '../atoms/FormHelpers';
import { Icon } from '../atoms/Icon';
import { cn } from '../../lib/utils';

interface Option {
  value: string;
  label: string;
}

interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: Option[];
}

export const SelectField: React.FC<SelectFieldProps> = ({
  label, error, helperText, options, className, id, ...props
}) => {
  return (
    <div className="space-y-1.5">
      {label && <Label htmlFor={id}>{label}</Label>}

      <div className="relative">
        <select
          id={id}
          className={cn(
            "flex h-10 w-full appearance-none rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-red-500 focus:ring-red-500",
            className
          )}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className="absolute right-3 top-2.5 pointer-events-none text-gray-500">
          <Icon icon={ChevronDown} size="sm" />
        </div>
      </div>

      <FormError message={error} />
      <FormHelper text={helperText} />
    </div>
  );
};