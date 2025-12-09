// --- TYPES ---
import { apiLogger } from './lib/apiLogger';

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

const N8N_WEBHOOK_URL = 'http://localhost:5678/webhook/data-api';

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await api._callDataApi<any>('listProjects');
    if (data && data.result && Array.isArray(data.result)) return data.result;
    return Array.isArray(data) ? data : [];
  },

  createProject: async (name: string, description: string = ''): Promise<Project> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await api._callDataApi<any>('createProject', { name, description });
    return data.result || data;
  },

  getProjectDetails: async (id: string): Promise<ProjectDetailsData> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await api._callDataApi<any>('getProjectDetails', { id });
    return data.result || data;
  },

  // --- STAGES & TEMPLATES ---

  listTemplates: async (): Promise<StageTemplate[]> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await api._callDataApi<any>('listTemplates');
    if (data && data.result && Array.isArray(data.result)) return data.result;
    return [];
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await api._callDataApi<any>('listAIModels');
    if (data && data.result && Array.isArray(data.result)) return data.result;
    return [];
  },

  getSystemPrompts: async (): Promise<SystemPrompt[]> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await api._callDataApi<any>('listSystemPrompts');
    if (data && data.result && Array.isArray(data.result)) return data.result;
    return [];
  },

  chatWithAI: async (message: string, context: string = '', modelId: string = 'gpt-4o'): Promise<string> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await api._callDataApi<any>('chat', { message, context, modelId });
    // Если API возвращает объект с полем reply/answer, нужно вернуть его
    // Если просто строку - вернуть строку
    return data.reply || data.result || "Ответ от ИИ не получен";
  },
};
