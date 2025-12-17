---
**Навигация:** [← Предыдущий раздел](08-detailed-implementation-checklist-phase-1D.md) | [Оглавление](00-TOC.md) | [Следующий раздел →](10-detailed-implementation-checklist-phase-2.md)
---

### Фаза 1E: Data API v2.1 (1-2 дня) ⏳

> **Цель:** Завершить CRUD endpoints с поддержкой CAS
> **Зависимости:** Фаза 1D (CAS Implementation)

#### Backend (n8n: `Coati Data API`)

**Дополнить недостающие endpoints:**
- [ ] `GET /iterations/:projectId/:stageId` - история Q&A
- [ ] `GET /prompts/:id` - получить промпт (с _rev)
- [ ] `PATCH /prompts/:id` - обновить промпт (с If-Match)
- [ ] `DELETE /projects/:id` - удалить проект
- [ ] `DELETE /stages/:id` - удалить этап
- [ ] `DELETE /documents/:id` - удалить документ

**Все endpoints должны:**
- Поддерживать CAS (If-Match headers)
- Возвращать обновлённый `_rev`
- Обрабатывать 409/423 errors
- Использовать retry policy (где применимо)

#### Frontend

**Обновить api.ts:**
- [ ] Добавить недостающие функции с CAS-поддержкой
- [ ] Zod схемы валидации: `AnalysisResultSchema`, `AIProviderConfigSchema`

**Тесты:**
- [ ] Unit-тесты для новых endpoints
- [ ] Валидация Zod схем

---
**Навигация:** [← Предыдущий раздел](08-detailed-implementation-checklist-phase-1D.md) | [Оглавление](00-TOC.md) | [Следующий раздел →](10-detailed-implementation-checklist-phase-2.md)
---