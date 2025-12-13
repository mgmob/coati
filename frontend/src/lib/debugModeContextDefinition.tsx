import { createContext } from 'react';

export interface DebugModeContextType {
  isDebugEnabled: boolean;
  setDebugEnabled: (enabled: boolean) => void;
  log: (message: string, data?: unknown) => void;
}

export const DebugModeContext = createContext<DebugModeContextType | undefined>(undefined);
