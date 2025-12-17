/**
 * Zod Validation Schemas
 *
 * Схемы валидации для API ответов и конфигураций
 */

import { z } from 'zod';

// =========================================
// AI Provider
// =========================================

export const AIProviderConfigSchema = z.object({
  provider: z.enum(['ollama', 'vllm', 'openai', 'anthropic']),
  url: z.string().url().optional(),
  apiKey: z.string().optional(),
  selectedModel: z.string().optional(),
});

export type AIProviderConfig = z.infer<typeof AIProviderConfigSchema>;

export const AIModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  size: z.number().optional(),
  modified: z.string().optional(),
  details: z.record(z.string(), z.unknown()).optional(),
});

export type AIModel = z.infer<typeof AIModelSchema>;

// =========================================
// Analysis Results
// =========================================

export const QAItemSchema = z.object({
  id: z.string(),
  question: z.string(),
  quote: z.string(),
  answer: z.string().optional(),
});

export type QAItem = z.infer<typeof QAItemSchema>;

export const AnalysisResultSchema = z.object({
  questions: z.array(QAItemSchema),
  issues: z.array(z.string()).optional().default([]),
  suggestions: z.array(z.string()).optional().default([]),
  score: z.number().optional(),
});

export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;

// =========================================
// Projects
// =========================================

export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  status: z.string().optional(),
  created_at: z.string().optional(),
});

export type Project = z.infer<typeof ProjectSchema>;

export const StageStepSchema = z.object({
  id: z.string(),
  type: z.string(),
  name: z.string(),
  is_required: z.boolean(),
  order: z.number(),
  status: z.enum(['pending', 'active', 'done']),
  config: z.object({
    model_id: z.string().optional(),
    system_prompt_id: z.string().optional(),
  }).optional(),
});

export type StageStep = z.infer<typeof StageStepSchema>;

export const ProjectStageSchema = z.object({
  _key: z.string().optional(),
  id: z.string().optional(),
  name: z.string(),
  status: z.enum(['pending', 'active', 'completed']),
  steps: z.array(StageStepSchema),
});

export type ProjectStage = z.infer<typeof ProjectStageSchema>;

// =========================================
// System Prompts
// =========================================

export const SystemPromptSchema = z.object({
  id: z.string(),
  name: z.string(),
  body: z.string().optional(),
  category: z.string().optional(),
});

export type SystemPrompt = z.infer<typeof SystemPromptSchema>;

// =========================================
// API Responses
// =========================================

export const ArangoResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    result: dataSchema,
    timestamp: z.number().optional(),
  });

export const ArangoCursorResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    result: z.array(dataSchema),
    hasMore: z.boolean().optional(),
    count: z.number().optional(),
  });

// =========================================
// Validation Helpers
// =========================================

/**
 * Безопасный парсинг с fallback значением
 */
export function safeParse<T>(schema: z.ZodSchema<T>, data: unknown, fallback: T): T {
  const result = schema.safeParse(data);
  if (result.success) {
    return result.data;
  }
  console.warn('[Zod] Validation failed:', result.error.issues);
  return fallback;
}

/**
 * Парсинг с выбросом ошибки
 */
export function parseOrThrow<T>(schema: z.ZodSchema<T>, data: unknown, context?: string): T {
  const result = schema.safeParse(data);
  if (result.success) {
    return result.data;
  }
  const errorMessage = result.error.issues.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`).join(', ');
  throw new Error(`[Zod] ${context || 'Validation'} failed: ${errorMessage}`);
}

/**
 * Валидация AnalysisResult от AI
 */
export function validateAnalysisResult(data: unknown): AnalysisResult {
  return safeParse(AnalysisResultSchema, data, {
    questions: [],
    issues: [],
    suggestions: [],
  });
}
