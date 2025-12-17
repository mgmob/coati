---
**Навигация:** [Оглавление](00-TOC.md) | [Следующий раздел →](01-current-state.md)
---

# Оглавление плана реализации AI Engine для Coati

## 📋 Общая информация

> ⭐ **НАЧНИ С РЕЕСТРА:** [00-REGISTRY.md](00-REGISTRY.md) - централизованный реестр всех актуальных документов

- **Исходный план:** [docs/progress/20251215_ai-implementation-plan-FINAL.md](../20251215_ai-implementation-plan-FINAL.md) 🟡 DEPRECATED
- **Статус:** Утвержден (версия 3.0)
- **Дата:** 15 декабря 2025 (обновлён 17 декабря 2025)
- **Версия:** 3.0 (с учётом Architecture Specification v2.1)

## 📚 Структура плана по файлам

### 00. [TOC.md](00-TOC.md) - Оглавление (этот файл)
*Полное оглавление всех разделов плана реализации AI Engine для Coati.*

### 01. [01-current-state.md](01-current-state.md) - Анализ текущего состояния
*Анализ реализованных компонентов и определение критически важных задач для реализации.*

### 02. [02-naming-convention.md](02-naming-convention.md) - Naming Convention для n8n Workflows
*Правила именования workflows для Coati, список существующих и новых workflows.*

### 03. [03-implementation-plan.md](03-implementation-plan.md) - План реализации (общий)
*Общий план реализации с детализацией Фазы 1: AI Provider Infrastructure.*

### 04. [04-detailed-implementation-checklist-phase-1.md](04-detailed-implementation-checklist-phase-1.md) - Фаза 1: AI Provider Infrastructure
*Детальный чеклист реализации Фазы 1 (4-5 дней, завершена 15-16 декабря 2025).*

### 05. [05-detailed-implementation-checklist-phase-1A.md](05-detailed-implementation-checklist-phase-1A.md) - Фаза 1A: Тестирование Frontend
*Чеклист тестирования frontend (1 день, завершена 16 декабря 2025).*

### 06. [06-detailed-implementation-checklist-phase-1B.md](06-detailed-implementation-checklist-phase-1B.md) - Фаза 1B: Architecture Specification v2.1
*Чеклист создания Architecture Specification v2.1 (2-3 дня, завершена 17 декабря 2025).*

### 07. [07-detailed-implementation-checklist-phase-1C.md](07-detailed-implementation-checklist-phase-1C.md) - Фаза 1C: MCP-Arango Setup
*Чеклист настройки MCP-сервера для ArangoDB (1 день, следующая фаза).*

### 08. [08-detailed-implementation-checklist-phase-1D.md](08-detailed-implementation-checklist-phase-1D.md) - Фаза 1D: Optimistic Concurrency Control (CAS)
*Чеклист реализации защиты от race conditions через `_rev` (2-3 дня).*

### 09. [09-detailed-implementation-checklist-phase-1E.md](09-detailed-implementation-checklist-phase-1E.md) - Фаза 1E: Data API v2.1
*Чеклист завершения CRUD endpoints с поддержкой CAS (1-2 дня).*

### 10. [10-detailed-implementation-checklist-phase-2.md](10-detailed-implementation-checklist-phase-2.md) - Фаза 2: Рефакторинг StageTimeline
*Чеклист рефакторинга StageTimeline (2-3 дня).*

### 11. [11-detailed-implementation-checklist-phase-3.md](11-detailed-implementation-checklist-phase-3.md) - Фаза 3: AI Analysis Engine
*Чеклист реализации AI Analysis Engine (5-6 дней).*

### 12. [12-detailed-implementation-checklist-phase-4.md](12-detailed-implementation-checklist-phase-4.md) - Фаза 4: RAG Integration
*Чеклист интеграции RAG для пользовательских документов (3-4 дня).*

### 13. [13-detailed-implementation-checklist-phase-5.md](13-detailed-implementation-checklist-phase-5.md) - Фаза 5: UI/UX & Workflow Management
*Чеклист улучшения UI/UX и управления workflow (2-3 дня).*

### 14. [14-component-structure.md](14-component-structure.md) - Итоговая структура компонентов
*Визуальная структура компонентов ProjectDetailsPage.*

### 15. [15-technical-details.md](15-technical-details.md) - Технические детали
*API endpoints, NPM зависимости и другие технические детали.*

### 16. [16-time-effort.md](16-time-effort.md) - Оценка времени
*Обновлённая оценка времени по фазам с статусами выполнения.*

### 17. [17-risks.md](17-risks.md) - Риски и митигация
*Риски реализации и меры по их снижению.*

### 18. [18-next-step.md](18-next-step.md) - Следующие шаги
*Текущая фаза и следующие шаги реализации.*

### 19. [19-mvp-success-criteria.md](19-mvp-success-criteria.md) - Критерии успеха MVP
*Функциональные и надёжностные критерии успеха MVP.*

### 20. [20-related-docs.md](20-related-docs.md) - Связанная документация
*Ссылки на Architecture Specification v2.1 и связанные документы.*

## 🔄 Навигация
- [Вернуться к началу](#оглавление-плана-реализации-ai-engine-для-coati)
- [Перейти к исходному плану](../20251215_ai-implementation-plan-FINAL.md)
- **Следующий раздел:** [01-current-state.md](01-current-state.md)

---

*Обновлено: 17 декабря 2025*
*[Вернуться к началу](#оглавление-плана-реализации-ai-engine-для-coati)*
