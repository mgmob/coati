import { create } from 'zustand';
import { api } from '../api';
import type { AIModel, SystemPrompt, StageTemplate } from '../api';
import { apiLogger } from '../lib/apiLogger';

interface AIState {
  models: AIModel[];
  prompts: SystemPrompt[];
  templates: StageTemplate[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchModels: () => Promise<void>;
  fetchPrompts: () => Promise<void>;
  fetchTemplates: () => Promise<void>;
  fetchAll: () => Promise<void>;
  clearError: () => void;
}

export const useAIStore = create<AIState>((set, get) => ({
  models: [],
  prompts: [],
  templates: [],
  loading: false,
  error: null,

  fetchModels: async () => {
    set({ loading: true, error: null });
    try {
      const models = await api.getAIModels();
      set({ models, loading: false });
      apiLogger.markProcessedGlobally('listAIModels', true, 'AI models loaded successfully');
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load AI models',
        loading: false
      });
    }
  },

  fetchPrompts: async () => {
    set({ loading: true, error: null });
    try {
      const prompts = await api.getSystemPrompts();
      set({ prompts, loading: false });
      apiLogger.markProcessedGlobally('listSystemPrompts', true, 'System prompts loaded successfully');
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load system prompts',
        loading: false
      });
    }
  },

  fetchTemplates: async () => {
    set({ loading: true, error: null });
    try {
      const templates = await api.listTemplates();
      set({ templates, loading: false });
      apiLogger.markProcessedGlobally('listTemplates', true, 'Templates loaded successfully');
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load templates',
        loading: false
      });
    }
  },

  fetchAll: async () => {
    const state = get();
    if (state.loading) return;

    set({ loading: true, error: null });
    try {
      const [models, prompts, templates] = await Promise.all([
        api.getAIModels(),
        api.getSystemPrompts(),
        api.listTemplates()
      ]);
      set({ models, prompts, templates, loading: false });
      apiLogger.markProcessedGlobally('listAIModels', true, 'All AI data loaded');
      apiLogger.markProcessedGlobally('listSystemPrompts', true, 'All AI data loaded');
      apiLogger.markProcessedGlobally('listTemplates', true, 'All AI data loaded');
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load AI data',
        loading: false
      });
    }
  },

  clearError: () => set({ error: null }),
}));
