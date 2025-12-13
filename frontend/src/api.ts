// --- TYPES ---
import { apiLogger } from './lib/apiLogger';

// ArangoDB Response Types
interface ArangoResponse<T> {
  result: T;
}

interface ArangoCursorResponse<T> {
  result: T[];
  hasMore?: boolean;
  count?: number;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  status?: string; // <-- Добавили статус
  created_at?: string;
}

export interface StageStep {
  id: string;
  type: string;
  name: string;
  is_required: boolean;
  order: number;
  status: 'pending' | 'active' | 'done';
  config?: {
    model_id?: string;
    system_prompt_id?: string;
  };
}

export interface ProjectStage {
  _key?: string; // ArangoDB key
  id?: string;   // Fallback
  name: string;
  status: 'pending' | 'active' | 'completed';
  steps: StageStep[];
}

export interface ProjectDetailsData {
  id: string;
  projectName: string;
  stages: ProjectStage[];
  content?: string;
}

export interface StageTemplate {
  id: string;
  name: string;
  description: string;
}

export interface AIModel {
  id: string;
  name: string;
}

export interface SystemPrompt {
  id: string;
  name: string;
}

export interface QAItem {
  id: string;
  question: string;
  quote: string;
  answer?: string;
}

export interface AnalysisResult {
  questions: QAItem[]; // <-- Было clarifyingQuestions: string[]
  issues: string[];
  suggestions: string[];
  score?: number;
}

// --- API CLIENT ---

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5678/webhook';
const DATA_ENDPOINT = import.meta.env.VITE_N8N_DATA_API || '/data-api';
const N8N_WEBHOOK_URL = `${API_BASE}${DATA_ENDPOINT}`;

export const api = {
  // Generic Fetch Wrapper
  _callDataApi: async <T>(action: string, payload: Record<string, unknown> = {}): Promise<T> => {
    const response = await apiLogger.wrappedFetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, payload }),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
  },

  // --- PROJECTS ---

  getProjects: async (): Promise<Project[]> => {
    const data = await api._callDataApi<ArangoCursorResponse<Project>>('listProjects');
    return data.result || [];
  },

  createProject: async (name: string, description: string = ''): Promise<Project> => {
    const data = await api._callDataApi<ArangoResponse<Project>>('createProject', { name, description });
    return data.result;
  },

  getProjectDetails: async (id: string): Promise<ProjectDetailsData> => {
    const data = await api._callDataApi<ArangoResponse<ProjectDetailsData>>('getProjectDetails', { id });
    return data.result;
  },

  // --- STAGES & TEMPLATES ---

  listTemplates: async (): Promise<StageTemplate[]> => {
    try {
      const data = await api._callDataApi<ArangoCursorResponse<StageTemplate>>('listTemplates');
      return data.result || [];
    } catch (error) {
      console.error('[API] listTemplates Error:', error);
      return [];
    }
  },

  addStage: async (projectId: string, templateId: string): Promise<void> => {
    await api._callDataApi('addStage', { projectId, templateId });
  },

  // Новый метод для обновления шагов
  updateStageSteps: async (projectId: string, stageId: string, steps: StageStep[]): Promise<void> => {
    // Пока просто логируем, так как в n8n нет обработчика updateStageSteps
    // В будущем нужно добавить ветку в Switch n8n
    console.log('API: updateStageSteps', { projectId, stageId, steps });
    // await api._callDataApi('updateStageSteps', { projectId, stageId, steps });
    return Promise.resolve();
  },

  // --- AI CONFIG ---

  getAIModels: async (): Promise<AIModel[]> => {
    const data = await api._callDataApi<ArangoCursorResponse<AIModel>>('listAIModels');
    return data.result || [];
  },

  getSystemPrompts: async (): Promise<SystemPrompt[]> => {
    const data = await api._callDataApi<ArangoCursorResponse<SystemPrompt>>('listSystemPrompts');
    return data.result || [];
  },

  chatWithAI: async (message: string, context: string = '', modelId: string = 'gpt-4o'): Promise<string> => {
    interface ChatResponse {
      reply?: string;
      result?: string;
    }
    const data = await api._callDataApi<ChatResponse>('chat', { message, context, modelId });
    return data.reply || data.result || "Ответ от ИИ не получен";
  },
};
