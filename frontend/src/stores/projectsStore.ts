import { create } from 'zustand';
import { api } from '../api';
import type { Project } from '../api';
import { apiLogger } from '../lib/apiLogger';

interface ProjectsState {
  projects: Project[];
  loading: boolean;
  error: string | null;
  selectedProjectId: string | null;

  // Actions
  fetchProjects: () => Promise<void>;
  createProject: (name: string, description: string) => Promise<Project>;
  selectProject: (id: string) => void;
  clearError: () => void;
}

export const useProjectsStore = create<ProjectsState>((set, get) => ({
  projects: [],
  loading: false,
  error: null,
  selectedProjectId: null,

  fetchProjects: async () => {
    const state = get();

    // Предотвращаем дублирование запросов
    if (state.loading) return;

    set({ loading: true, error: null });
    try {
      const projects = await api.getProjects();
      set({ projects, loading: false });
      apiLogger.markProcessedGlobally('listProjects', true, 'Projects loaded successfully');
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load projects',
        loading: false
      });
    }
  },

  createProject: async (name, description) => {
    set({ loading: true, error: null });
    try {
      const newProject = await api.createProject(name, description);
      set(state => ({
        projects: [newProject, ...state.projects],
        loading: false
      }));
      return newProject;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create project',
        loading: false
      });
      throw error;
    }
  },

  selectProject: (id) => set({ selectedProjectId: id }),

  clearError: () => set({ error: null }),
}));
