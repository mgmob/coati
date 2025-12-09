import React from 'react';
import { cn } from '../../lib/utils';

interface TypographyProps extends React.HTMLAttributes<HTMLElement> {
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'small' | 'caption';
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  color?: string;
}

export const Typography: React.FC<TypographyProps> = ({
  variant = 'body',
  weight = 'normal',
  color = 'text-gray-900',
  className,
  children,
  ...props
}) => {
  const styles = {
    h1: "text-2xl font-bold",
    h2: "text-xl font-semibold",
    h3: "text-lg font-semibold",
    h4: "text-base font-medium",
    body: "text-sm",
    small: "text-xs",
    caption: "text-[10px] uppercase tracking-wider",
  };

  const weights = {
    normal: "font-normal",
    medium: "font-medium",
    semibold: "font-semibold",
    bold: "font-bold",
  };

  const Component = variant.startsWith('h') ? variant : 'p';

  return React.createElement(
    Component,
    { className: cn(styles[variant], weights[weight], color, className), ...props },
    children
  );
};