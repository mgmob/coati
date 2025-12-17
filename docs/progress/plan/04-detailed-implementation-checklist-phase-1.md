---
**Навигация:** [← Предыдущий раздел](03-implementation-plan.md) | [Оглавление](00-TOC.md) | [Следующий раздел →](05-detailed-implementation-checklist-phase-1A.md)
---

## 📋 Детальный чеклист реализации

### Фаза 1: AI Provider Infrastructure (4-5 дней) ✅ ЗАВЕРШЕНА

> **Дата выполнения:** 15-16 декабря 2025

#### Backend (n8n workflows)
- [x] Создать workflow `Coati AI Provider Manager` ✅
  - [x] Action `listModels` (Ollama) ✅
  - [x] Action `testConnection` ✅
  - [x] Action `chat` ✅
  - [x] Action `analyze` (с JSON парсером) ✅
  - [ ] Заглушки для OpenAI/Anthropic (в будущем)
- [x] Создать workflow `Coati AI Generate Embeddings` ✅
  - [x] HTTP Request to Ollama /api/embeddings ✅
  - [x] Model: nomic-embed-text ✅
  - [x] Return 768-dimensional vector ✅
- [x] JSON парсер встроен в `Coati AI Provider Manager` (analyze action)
  - [x] Smart JSON extraction ✅
  - [x] Markdown cleanup ✅
  - [x] json-repair fallback ✅
- [x] Дополнить `Coati Data API`:
  - [x] Обновлена логика CRUD routing (save* actions → CREATE) ✅
  - [x] Добавлен switch-case для `saveIteration` ✅
  - [x] Добавлен switch-case для `createSystemPrompt` ✅

#### Frontend
- [x] Создать `aiProviderStore.ts` (Zustand) ✅
  - [x] persist middleware ✅
  - [x] useShallow для предотвращения infinite loops ✅
- [x] Создать компонент `AIProviderSelector.tsx` ✅
  - [x] Форма выбора провайдера ✅
  - [x] Поля URL/API Key ✅
  - [x] Кнопка "Проверить подключение" ✅
  - [x] Dropdown моделей (динамический) ✅
  - [x] Компактный вид ✅
- [x] Обновить `api.ts` ✅
  - [x] `saveIteration()` ✅
  - [x] `getIterations()` ✅
  - [x] `getSystemPrompt()` ✅
  - [x] `updateSystemPrompt()` ✅
  - [x] `createSystemPrompt()` ✅
  - [x] `analyzeDocument()` ✅
- [x] Интегрировать AIProviderSelector в ProjectDetailsPage ✅

#### Скрипты синхронизации
- [x] Исправлен `sync-workflows.js` ✅
  - [x] Фильтрация полей при создании workflow ✅
  - [x] Добавлены алиасы `npm run sync`, `npm run backup` ✅
- [x] Все workflows синхронизированы в n8n ✅

---
**Навигация:** [← Предыдущий раздел](03-implementation-plan.md) | [Оглавление](00-TOC.md) | [Следующий раздел →](05-detailed-implementation-checklist-phase-1A.md)
---