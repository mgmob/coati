---
**Навигация:** [← Предыдущий раздел](02-naming-convention.md) | [Оглавление](00-TOC.md) | [Следующий раздел →](04-detailed-implementation-checklist-phase-1.md)
---

## 🎯 План реализации (обновлённый порядок фаз)

### **Фаза 1: AI Provider Infrastructure (4-5 дней)**

#### 1.1. Глобальный селектор AI провайдера

**Frontend компоненты:**

**`frontend/src/components/organisms/AIProviderSelector.tsx`**
```typescript
interface AIProviderConfig {
  provider: 'ollama' | 'vllm' | 'openai' | 'anthropic';
  url?: string;
  apiKey?: string;
  selectedModel?: string;
}

// Состояния:
// 1. Форма выбора (развернутая)
// 2. Компактный вид (провайдер + модель)
// 3. Загрузка моделей
// 4. Ошибка подключения
```

**Функционал:**
- Dropdown выбора провайдера
- Поле URL (для Ollama/vLLM)
- Поле API Key (для OpenAI/Anthropic)
- Кнопка "Проверить подключение" → запрос списка моделей
- Dropdown выбора модели (динамический)
- Кнопка "Применить" → сохранение в Zustand store
- Компактный вид: `Ollama | llama3.2:3b [изменить]`

**Backend (n8n):**

**Новый workflow: `Coati AI Provider Manager`**
```
Webhook (/ai-provider)
  ↓
Switch by action:
  - listModels
  - testConnection
  ↓
HTTP Request (динамический URL)
  ↓
Format Response
  ↓
Respond
```

**Actions:**
1. `listModels` - получить список моделей от провайдера
2. `testConnection` - проверка доступности

**Zustand store:**

**`frontend/src/stores/aiProviderStore.ts`**
```typescript
interface AIProviderState {
  provider: string;
  url: string;
  apiKey: string;
  selectedModel: string;
  availableModels: AIModel[];
  isConnected: boolean;

  testConnection: () => Promise<boolean>;
  loadModels: () => Promise<void>;
  setProvider: (config: AIProviderConfig) => void;
}
```

---

#### 1.2. Embeddings Integration (Ollama + nomic-embed-text)

**Установка модели:**
```bash
ollama pull nomic-embed-text
```

**Backend workflow: `Coati AI Generate Embeddings`**

```
Webhook (/generate-embeddings)
  ↓
HTTP Request to Ollama
  POST http://ollama:11434/api/embeddings
  Body: {
    model: "nomic-embed-text",
    prompt: {{ $json.text }}
  }
  ↓
Extract embedding vector (768 dimensions)
  ↓
Respond with {embedding: [...]}
```

**Характеристики nomic-embed-text:**
- **Размерность:** 768
- **Контекст:** 8192 токена
- **Язык:** Multilingual (включая русский)
- **Скорость:** ~10-20ms на embedding
- **Качество:** Сравнимо с OpenAI text-embedding-ada-002

---

#### 1.3. JSON Response Protection

**Backend sub-workflow: `Coati AI Parse Response`**

```javascript
function parseAIResponse(rawText) {
  let cleaned = rawText;

  // 1. Удалить markdown обертку
  cleaned = cleaned.replace(/```json\s*/g, '').replace(/```\s*/g, '');

  // 2. Удалить текст до первой {
  const jsonStart = cleaned.indexOf('{');
  if (jsonStart > 0) cleaned = cleaned.slice(jsonStart);

  // 3. Удалить текст после последней }
  const jsonEnd = cleaned.lastIndexOf('}');
  if (jsonEnd > 0) cleaned = cleaned.slice(0, jsonEnd + 1);

  // 4. Удалить JS комментарии
  cleaned = cleaned.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

  // 5. Попытка парсинга
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // 6. Использовать json-repair
    const { jsonRepair } = require('json-repair');
    return JSON.parse(jsonRepair(cleaned));
  }
}
```

**Frontend валидация (Zod):**
```typescript
import { z } from 'zod';

const AnalysisResultSchema = z.object({
  questions: z.array(z.object({
    id: z.string(),
    question: z.string(),
    quote: z.string()
  })),
  issues: z.array(z.string()).optional(),
  suggestions: z.array(z.string()).optional()
});
```

---
**Навигация:** [← Предыдущий раздел](02-naming-convention.md) | [Оглавление](00-TOC.md) | [Следующий раздел →](04-detailed-implementation-checklist-phase-1.md)
---