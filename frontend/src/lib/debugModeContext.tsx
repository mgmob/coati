import React, { useState, type ReactNode } from 'react';
import { DebugModeContext } from './debugModeContextDefinition';

interface DebugModeProviderProps {
  children: ReactNode;
}

export const DebugModeProvider: React.FC<DebugModeProviderProps> = ({ children }) => {
  const [isDebugEnabled, setDebugEnabled] = useState(true); // Default: enabled

  const log = (message: string, data?: unknown) => {
    if (isDebugEnabled) {
      console.log(`[DEBUG] ${message}`, data);
    }
  };

  return (
    <DebugModeContext.Provider value={{ isDebugEnabled, setDebugEnabled, log }}>
      {children}
    </DebugModeContext.Provider>
  );
};
