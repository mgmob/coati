---
**Навигация:** [← Предыдущий раздел](07-detailed-implementation-checklist-phase-1C.md) | [Оглавление](00-TOC.md) | [Следующий раздел →](09-detailed-implementation-checklist-phase-1E.md)
---

### Фаза 1D: Optimistic Concurrency Control (CAS) (2-3 дня) ⏳

> **Цель:** Реализовать защиту от race conditions через `_rev` и If-Match headers
> **Приоритет:** Критический (блокирует Фазу 1E)

#### Backend (n8n: `Coati Data API`)

**Обновить существующие workflows с CAS:**
- [ ] `POST /atoms/:id/lock`
  - Принимать If-Match header с `atom_rev`
  - CAS UPDATE с `ignoreRevs: false`
  - Возвращать новый `atom_rev`
  - 409 CONFLICT при revision mismatch
  - 423 LOCKED при активной блокировке
- [ ] `POST /atoms/:id/unlock`
  - Принимать If-Match header
  - Проверка владельца (`locked_by == user_id`)
  - CAS UPDATE
  - 423 LOCKED если не владелец
- [ ] `PATCH /atoms/:id/archive`
  - Принимать If-Match header
  - Проверка baseline protection
  - CAS UPDATE
  - Удаление из `structure_links`
- [ ] `POST /proposals/:id/merge`
  - Принимать If-Match header с `structure_edge_rev`
  - CAS UPDATE по edge `_rev`
  - Auto-rebase других proposals
  - Обновление статусов атомов
  - Создание revision_links

**Новые endpoints:**
- [ ] `GET /documents/:id/structure` - вернуть `atom_rev` + `structure_edge_rev`
- [ ] `GET /errors` - список AI ошибок для Debug Panel

**Retry Policy:**
- [ ] Реализовать exponential backoff для 409 conflicts
  - 1st retry: 50ms
  - 2nd retry: 150ms
  - 3rd retry: 450ms
  - Max 3 retries

**Validation Script:**
- [ ] Создать workflow `Coati DB Validation Script`
  - Поиск атомов с multiple parents
  - Проверка proposal_links корректности
  - Обнаружение illegal `docs -> atoms` edges
  - Возврат `{ok: boolean, issues: [...]}`

#### Frontend

**Обновить api.ts:**
```typescript
// Новые сигнатуры с _rev
async lockAtom(atomId: string, userId: string, expectedRev: string): Promise<{
  success: boolean;
  locked_until: string;
  atom_rev: string;
}>

async mergeProposal(proposalId: string, params: {
  target_active_atom_id: string;
  structure_edge_id: string;
  structure_edge_rev: string;
  user_id: string;
}): Promise<MergeResult>

// Retry logic
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T>

// Error classes
class RevisionConflictError extends Error {
  status = 409;
}

class ResourceLockedError extends Error {
  status = 423;
  constructor(message: string, public lockedBy: string, public lockedUntil: string) {}
}
```

**Обновить stores:**
- [ ] `projectsStore` - хранение `_rev` для каждого атома
- [ ] Автоматическое обновление `_rev` после мутаций
- [ ] Обработка 409 с UI feedback ("Data changed, please refresh")
- [ ] Обработка 423 с UI feedback ("Locked by User X until HH:MM")

**UI Components:**
- [ ] Conflict Dialog - "Document changed. Refresh?" [Refresh] [Cancel]
- [ ] Lock Indicator - "🔒 Editing by User A (3:45 remaining)"
- [ ] Toast notifications для ошибок

#### Тесты

**Unit-тесты (api.ts):**
- [ ] `lockAtom()` отправляет If-Match header
- [ ] `lockAtom()` retry на 409 (3 раза)
- [ ] `lockAtom()` НЕ retry на 423
- [ ] `mergeProposal()` использует structure_edge_rev
- [ ] `withRetry()` exponential backoff
- [ ] Error handling (409, 423)

**Integration-тесты:**
- [ ] Concurrent lock attempts (User A vs User B)
- [ ] Stale revision on merge
- [ ] Baseline protection на archive
- [ ] Lock timeout (5 минут)

**Stress-тесты (опционально для post-MVP):**
- [ ] 50 sequential merges
- [ ] 10+ concurrent users editing

#### Validation Script (npm script)
- [ ] Создать `scripts/validate-graph.js`
- [ ] Добавить в package.json:
  ```json
  {
    "scripts": {
      "db:validate": "node scripts/validate-graph.js"
    }
  }
  ```
- [ ] Pre-release checklist: запускать вручную перед релизом

**Обоснование ручного запуска (не CI/CD):**
- Скорость разработки: CI/CD integration занимает 1-2 дня
- Частота использования: На MVP релизы 1-2 раза в неделю
- Простота отладки: Ручной запуск → сразу видишь результат
- Гибкость: Можно запускать по требованию

---
**Навигация:** [← Предыдущий раздел](07-detailed-implementation-checklist-phase-1C.md) | [Оглавление](00-TOC.md) | [Следующий раздел →](09-detailed-implementation-checklist-phase-1E.md)
---