# 📋 Реестр актуальных документов проекта Coati

> **Обновлено:** 17 декабря 2025, 21:46 (МСК)
>
> **⭐ НАЧНИ ОТСЮДА** - Этот файл содержит ссылки на актуальные версии всех ключевых документов проекта

---

## 🎯 Рабочий План (Working Plan)

| Статус | Документ | Версия | Дата | Заменяет |
|--------|----------|--------|------|----------|
| 🟢 ACTIVE | [00-TOC.md](00-TOC.md) | 3.0 | 2025-12-17 | - |
| 🟢 ACTIVE | [01-current-state.md](01-current-state.md) | 1.0 | 2025-12-17 | - |
| 🟢 ACTIVE | [02-naming-convention.md](02-naming-convention.md) | 1.0 | 2025-12-17 | - |
| 🟢 ACTIVE | [03-implementation-plan.md](03-implementation-plan.md) | 1.0 | 2025-12-17 | - |
| 🟢 ACTIVE | [04-detailed-implementation-checklist-phase-1.md](04-detailed-implementation-checklist-phase-1.md) | 1.0 | 2025-12-17 | - |
| 🟢 ACTIVE | [05-detailed-implementation-checklist-phase-1A.md](05-detailed-implementation-checklist-phase-1A.md) | 1.0 | 2025-12-17 | - |
| 🟢 ACTIVE | [06-detailed-implementation-checklist-phase-1B.md](06-detailed-implementation-checklist-phase-1B.md) | 1.0 | 2025-12-17 | - |
| 🔵 IN PROGRESS | [07-detailed-implementation-checklist-phase-1C.md](07-detailed-implementation-checklist-phase-1C.md) | 2.0 | 2025-12-17 | 1.0 |
| ⏳ PLANNED | [07a-detailed-implementation-checklist-phase-1C-migration.md](07a-detailed-implementation-checklist-phase-1C-migration.md) | 1.0 | 2025-12-17 | - |
| 🟢 ACTIVE | [08-detailed-implementation-checklist-phase-1D.md](08-detailed-implementation-checklist-phase-1D.md) | 1.0 | 2025-12-17 | - |
| 🟢 ACTIVE | [09-detailed-implementation-checklist-phase-1E.md](09-detailed-implementation-checklist-phase-1E.md) | 1.0 | 2025-12-17 | - |
| 🟢 ACTIVE | [10-detailed-implementation-checklist-phase-2.md](10-detailed-implementation-checklist-phase-2.md) | 1.0 | 2025-12-17 | - |
| 🟢 ACTIVE | [11-detailed-implementation-checklist-phase-3.md](11-detailed-implementation-checklist-phase-3.md) | 1.0 | 2025-12-17 | - |
| 🟢 ACTIVE | [12-detailed-implementation-checklist-phase-4.md](12-detailed-implementation-checklist-phase-4.md) | 1.0 | 2025-12-17 | - |
| 🟢 ACTIVE | [13-detailed-implementation-checklist-phase-5.md](13-detailed-implementation-checklist-phase-5.md) | 1.0 | 2025-12-17 | - |
| 🟢 ACTIVE | [14-component-structure.md](14-component-structure.md) | 1.0 | 2025-12-17 | - |
| 🟢 ACTIVE | [15-technical-details.md](15-technical-details.md) | 1.0 | 2025-12-17 | - |
| 🟢 ACTIVE | [16-time-effort.md](16-time-effort.md) | 2.0 | 2025-12-17 | 1.0 |
| 🟢 ACTIVE | [17-risks.md](17-risks.md) | 1.0 | 2025-12-17 | - |
| 🟢 ACTIVE | [18-next-step.md](18-next-step.md) | 1.0 | 2025-12-17 | - |
| 🟢 ACTIVE | [19-mvp-success-criteria.md](19-mvp-success-criteria.md) | 1.0 | 2025-12-17 | - |
| 🟢 ACTIVE | [20-related-docs.md](20-related-docs.md) | 1.0 | 2025-12-17 | - |

---

## 🏗️ Архитектурные спецификации

| Статус | Документ | Версия | Дата | Заменяет |
|--------|----------|--------|------|----------|
| 🟢 ACTIVE | [Исходное ТЗ (может отличаться от последних детальных спецификаций!)](C:\Projects\Personal\Coati_SaaS.md) | 0 | 2025-12-10 | - |
| 🟢 ACTIVE | [Architecture v2.1 - Section 1: Data Schema](../20251217_architecture-v2.1-section1.md) | 2.1 | 2025-12-17 | v2.0 |
| 🟢 ACTIVE | [Architecture v2.1 - Section 2: API Contracts](../20251217_architecture-v2.1-section2.md) | 2.1 | 2025-12-17 | v2.0 |
| 🟢 ACTIVE | [Architecture v2.1 - Section 3: n8n Workflows](../20251217_architecture-v2.1-section3.md) | 2.1 | 2025-12-17 | v2.0 |
| 🟢 ACTIVE | [Architecture v2.1 - Section 4: Initial Data Seeding](../20251217_architecture-v2.1-section4.md) | 2.1 | 2025-12-17 | v2.0 |
| 🟡 DEPRECATED | [Architecture v2.0 FINAL](../20251217_architecture-v2-FINAL.md) | 2.0 | 2025-12-17 | v1.0 |

**Ключевые изменения v2.1:**
- Optimistic Concurrency Control (CAS) через `_rev`
- Single Parent Invariant для structure_links
- Запрет прямых связей `docs -> atoms`
- Улучшенная обработка ошибок AI
- Validation script для проверки целостности графа

---

## 📝 Планы реализации

| Статус | Документ | Версия | Дата | Заменяет |
|--------|----------|--------|------|----------|
| 🟢 ACTIVE | [AI Implementation Plan - Modular](plan/00-TOC.md) | 3.0 | 2025-12-17 | 2.0 |
| 🟡 DEPRECATED | [AI Implementation Plan FINAL](../20251215_ai-implementation-plan-FINAL.md) | 2.0 | 2025-12-15 | 1.0 |

**Почему модульная структура?**
- Легче навигироваться между фазами
- Можно обновлять отдельные разделы
- Четкая трассировка изменений
- Удобная навигация между разделами

---

## 📖 Обзоры и аудиты

| Статус | Документ | Версия | Дата | Назначение |
|--------|----------|--------|------|------------|
| 🔵 REFERENCE | [Destructive Architecture Review](../20251217_SPEC-2.0-AUDIT.md) | 1.0 | 2025-12-17 | Аудит v2.0 на критические блокеры |
| 🔵 REFERENCE | [Technical Patch v2.1](../20251217_PATCH.md) | 1.0 | 2025-12-17 | Точечные исправления для v2.1 |
| 🔵 REFERENCE | [Architecture Improvement Analysis](../20251216_architecture-improvement.md) | 1.0 | 2025-12-16 | Анализ улучшений архитектуры |
| 🔵 REFERENCE | [Zustand Migration and API Unification](../20251213_zustand-migration-and-api-unification.md) | 1.0 | 2025-12-13 | План миграции на Zustand |

---

## 🔄 Миграции данных

| Статус | Миграция | Целевая версия | Дата запланирована | Описание |
|--------|----------|----------------|-------------------|----------|
| ⏳ PENDING | Migration v2.0 → v2.1 | v2.1 | TBD | Удаление parent_doc_id, создание индексов CAS |

**Требования перед миграцией:**
1. ✅ Фаза 1C завершена (MCP-Arango настроен)
2. ⏳ Финализация изменений в схеме БД
3. ⏳ Создание backup workflow
4. ⏳ Dry-run тестирование миграции

---

## 🛠️ Инструменты и утилиты

| Документ | Назначение |
|----------|------------|
| [add-navigation.js](plan/add-navigation.js) | Скрипт добавления навигации в markdown файлы |
| [fix-navigation.js](plan/fix-navigation.js) | Скрипт исправления навигации |

---

## 📊 Легенда статусов

| Статус | Значение | Когда использовать |
|--------|----------|-------------------|
| 🟢 **ACTIVE** | Актуальный документ | Используется в работе прямо сейчас |
| 🔵 **IN PROGRESS** | В разработке | Документ редактируется |
| ⏳ **PLANNED** | Запланирован | Будет создан в будущем |
| 🔵 **REFERENCE** | Справочный | Исторический/аналитический материал |
| 🟡 **DEPRECATED** | Устаревший | Заменен новой версией, сохранен для истории |
| 🔴 **OBSOLETE** | Полностью устарел | Можно архивировать/удалить |

---

## 🚀 Быстрый старт

### Для нового разработчика:
1. Прочитай этот реестр (00-REGISTRY.md)
2. Изучи [00-TOC.md](00-TOC.md) для понимания структуры плана
3. Ознакомься с [Architecture v2.1 Section 1](../20251217_architecture-v2.1-section1.md)
4. Проверь текущую фазу в [18-next-step.md](18-next-step.md)

### Для обновления документов:
1. Обнови содержимое документа
2. Измени версию в этом реестре
3. Укажи дату обновления
4. Если создаешь новую версию - пометь старую как DEPRECATED
5. Обнови поле "Обновлено" в начале реестра

---

## 🔗 Внешние ссылки

- **GitHub Repository:** [mgmob/coati](https://github.com/mgmob/coati)
- **Latest Commit:** `9dfa7a3169a8c93362e7f39bb4de71bc2aafa12f`
- **n8n Instance:** http://localhost:5678
- **ArangoDB Web UI:** http://localhost:8529

---

**Последнее обновление реестра:** 17 декабря 2025, 21:46 (МСК)
**Версия реестра:** 1.0
**Ответственный за обновление:** Cline (AI Assistant)
