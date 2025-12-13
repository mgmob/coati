import { useContext } from 'react';
import type { DebugModeContextType } from './debugModeContextDefinition';
import { DebugModeContext } from './debugModeContextDefinition';

export const useDebugMode = (): DebugModeContextType => {
  const context = useContext(DebugModeContext);
  if (!context) {
    throw new Error('useDebugMode must be used within a DebugModeProvider');
  }
  return context;
};
