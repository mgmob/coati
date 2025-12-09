import React from 'react';
import { cn } from '../../lib/utils';

interface LogoProps {
  className?: string;
  size?: number;
}

export const Logo: React.FC<LogoProps> = ({ className, size = 32 }) => {
  return (
    <div
      className={cn("flex items-center justify-center select-none leading-none", className)}
      style={{ fontSize: size }}
    >
      🦝
    </div>
  );
};