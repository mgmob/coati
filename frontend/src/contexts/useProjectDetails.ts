import { createContext, useContext } from 'react';
import type { ProjectDetailsData, StageStep } from '../api';
import { api } from '../api';

// --- TYPES ---

// Stage type derived from API
export type Stage = ProjectDetailsData['stages'][0];

// API proxy interface to avoid 'any' types - matching actual api.ts methods
export interface ProjectApi {
  getProjectDetails: (id: string) => Promise<ProjectDetailsData>;
  addStage: (projectId: string, templateId: string) => Promise<void>;
  updateStageSteps: (projectId: string, stageId: string, steps: StageStep[]) => Promise<void>;
}

// --- CONTEXT ---

export interface ProjectDetailsContextType {
  project: ProjectDetailsData | null;
  isLoading: boolean;
  error: string | null;
  addStage: (templateId: string) => Promise<void>;
  updateStageSteps: (stageId: string, steps: StageStep[]) => Promise<void>;
  setContent: (content: string) => void;
}

export const ProjectDetailsContext = createContext<ProjectDetailsContextType | undefined>(undefined);

// --- HOOK ---

export const useProjectDetails = () => {
  const context = useContext(ProjectDetailsContext);
  if (!context) {
    throw new Error('useProjectDetails must be used within a ProjectDetailsProvider');
  }
  return context;
};

// --- API PROXY ---

// Typed proxy for api object to avoid 'any' usage
export const typedApi = api as unknown as ProjectApi;
