---
**Навигация:** [← Предыдущий раздел](10-detailed-implementation-checklist-phase-2.md) | [Оглавление](00-TOC.md) | [Следующий раздел →](12-detailed-implementation-checklist-phase-4.md)
---

### Фаза 3: AI Analysis Engine (5-6 дней)

> **Зависимости:** Фаза 2 (промпты)

#### Backend (n8n)
- [ ] Создать workflow `Coati AI Build Context`
  - [ ] Query: project metadata
  - [ ] Query: existing requirements
  - [ ] Query: previous iterations
  - [ ] Optional: RAG search
  - [ ] Format context string
- [ ] Создать workflow `Coati AI Analyze Document`
  - [ ] Вызов Context Builder
  - [ ] Вызов AI Provider
  - [ ] Parse AI Response
  - [ ] Save to Iterations
- [ ] Создать workflow `Coati AI Compliance Check`
  - [ ] For each Q&A → AI call
  - [ ] Return compliance results

#### Frontend
- [ ] Обновить `QAPanel.tsx`
  - [ ] Показ Compliance Check результатов
  - [ ] Предупреждение о несоответствиях
- [ ] Добавить кнопку "Анализировать"
- [ ] Индикаторы загрузки
- [ ] Zod схемы валидации

#### Промпты
- [ ] Создать "Анализ неопределенностей"
- [ ] Создать "Compliance Check"
- [ ] Создать "Генерация требований"

---
**Навигация:** [← Предыдущий раздел](10-detailed-implementation-checklist-phase-2.md) | [Оглавление](00-TOC.md) | [Следующий раздел →](12-detailed-implementation-checklist-phase-4.md)
---