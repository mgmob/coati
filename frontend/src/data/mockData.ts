export interface AIModel {
  id: string;
  name: string;
  description: string;
}

export interface SystemPrompt {
  id: string;
  title: string;
  category: 'Brief' | 'BR' | 'FR' | 'API' | 'Compliance';
  content: string; // Шаблон промпта
}

export const AI_MODELS: AIModel[] = [
  { id: 'deepseek-v3.1:617b-cloud', name: 'DeepSeek-V3', description: 'DeepSeek‑R1, крупномасштабный трансформер для сложных задач.' },
  { id: 'gpt-oss:120b-cloud', name: 'GPT-OSS 120B', description: 'Мощная модель на архитектуре GPT-4. Знания до июня 2024.' },
  { id: 'qwen3-coder:480b-cloud', name: 'Qwen3 Coder', description: 'Специализирована на коде и технической документации.' },
  { id: 'qwen2.5:3b', name: 'Qwen 2.5 (Local)', description: 'Быстрая локальная модель для тестов.' },
];

export const SYSTEM_PROMPTS: SystemPrompt[] = [
  {
    id: 'ambiguity-strict',
    title: 'Строгий поиск неопределенностей',
    category: 'BR',
    content: 'Ты строгий системный аналитик. Найди все двусмысленности в тексте. Игнорируй дизайн.'
  },
  {
    id: 'ambiguity-soft',
    title: 'Мягкое уточнение (для новичков)',
    category: 'Brief',
    content: 'Ты помощник. Задай уточняющие вопросы, если что-то непонятно, но не будь занудой.'
  },
  {
    id: 'security-audit',
    title: 'Аудит безопасности',
    category: 'Compliance',
    content: 'Проверь требования на соответствие стандартам OWASP. Найди уязвимости.'
  },
];