import React, { useEffect, useState, useRef } from 'react';
import type { ReactNode } from 'react';
import { ProjectDetailsContext, typedApi, type ProjectDetailsContextType } from './useProjectDetails';
import type { ProjectDetailsData, StageStep } from '../api';
import { apiLogger } from '../lib/apiLogger';

interface ProviderProps {
  projectId: string;
  children: ReactNode;
}

export const ProjectDetailsProvider: React.FC<ProviderProps> = ({ projectId, children }) => {
  const [project, setProject] = useState<ProjectDetailsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isFetching = useRef(false);
  const currentProjectId = useRef<string | null>(null);

  useEffect(() => {
    if (projectId === currentProjectId.current) return;

    const load = async () => {
      if (isFetching.current) return;
      isFetching.current = true;
      currentProjectId.current = projectId;

      setIsLoading(true);
      setError(null);

      try {
        const rawData = await typedApi.getProjectDetails(projectId);

        console.log('[ProjectProvider] Raw API Response:', rawData);

        // FIX: Unwrap array if necessary (n8n often returns arrays)
        const validData = Array.isArray(rawData) ? (rawData as ProjectDetailsData[])[0] : rawData;

        setProject(validData);
        apiLogger.markProcessedGlobally('getProjectDetails', true, 'Project details loaded successfully');
      } catch (err) {
        console.error(err);
        setError('Failed to load project details');
        currentProjectId.current = null;
      } finally {
        setIsLoading(false);
        isFetching.current = false;
      }
    };

    load();
  }, [projectId]);

  const addStage = async (templateId: string) => {
    if (!project) return;
    try {
      await typedApi.addStage(project.id, templateId);
      // Reload project data since addStage doesn't return updated data
      const updatedProject = await typedApi.getProjectDetails(project.id);
      setProject(updatedProject);
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const updateStageSteps = async (stageId: string, steps: StageStep[]) => {
    if (!project) return;
    try {
      await typedApi.updateStageSteps(project.id, stageId, steps);

      // Optimistic update
      setProject(prev => {
          if (!prev) return null;
          const newStages = prev.stages.map((stage) => {
              const currentId = stage.id || stage._key;
              if (currentId === stageId) {
                  return { ...stage, steps };
              }
              return stage;
          });
          return { ...prev, stages: newStages };
      });
    } catch (e) {
        console.error(e);
        throw e;
    }
  };

  const setContent = (content: string) => {
    if (project) {
      setProject({ ...project, content });
    }
  };

  const contextValue: ProjectDetailsContextType = {
    project,
    isLoading,
    error,
    addStage,
    updateStageSteps,
    setContent
  };

  return (
    <ProjectDetailsContext.Provider value={contextValue}>
      {children}
    </ProjectDetailsContext.Provider>
  );
};
