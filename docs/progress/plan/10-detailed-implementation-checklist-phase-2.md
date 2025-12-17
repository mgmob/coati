---
**Навигация:** [← Предыдущий раздел](09-detailed-implementation-checklist-phase-1E.md) | [Оглавление](00-TOC.md) | [Следующий раздел →](11-detailed-implementation-checklist-phase-3.md)
---

### Фаза 2: Рефакторинг StageTimeline (2-3 дня)

> **Зависимости:** Фаза 1E (промпты с _rev)

#### Frontend
- [ ] Удалить dropdown выбора AI модели из `StageTimeline.tsx`
- [ ] Создать компонент `PromptEditor.tsx`
  - [ ] Compact view: `🤖 {name} [👁️] [✏️]`
  - [ ] Edit mode: Textarea + toolbar
  - [ ] Dropdown выбора шаблона (фильтр по типу шага)
  - [ ] Подсветка переменных `{{...}}`
  - [ ] Split Button: [Apply] + Menu
    - Apply (сохранить для шага)
    - Update Template (с CAS!)
    - Save as New
  - [ ] Кнопка "Reset"
- [ ] Dirty state tracking
- [ ] Валидация переменных
- [ ] CAS при обновлении шаблонов (If-Match: prompt._rev)

---
**Навигация:** [← Предыдущий раздел](09-detailed-implementation-checklist-phase-1E.md) | [Оглавление](00-TOC.md) | [Следующий раздел →](11-detailed-implementation-checklist-phase-3.md)
---