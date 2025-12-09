import React from 'react';
import { Label } from '../atoms/Label';
import { FormError, FormHelper } from '../atoms/FormHelpers';
import { cn } from '../../lib/utils';

interface FormFieldProps {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
  id?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label, error, helperText, required, className, children, id
}) => {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && <Label htmlFor={id} required={required}>{label}</Label>}
      {children}
      <FormError message={error} />
      <FormHelper text={helperText} />
    </div>
  );
};