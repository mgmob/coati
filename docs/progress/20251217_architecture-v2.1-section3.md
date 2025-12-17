# Раздел 3. Логика Workflow в n8n (Алгоритмы v2.1)

В этом разделе описаны сценарии (Workflows), которые должен реализовывать n8n. Все изменения данных должны выполняться транзакционно (через AQL-транзакции в ArangoDB), чтобы не нарушить целостность графа.

**v2.1 Critical Rule (CAS):**
- Любой `UPDATE/REPLACE/REMOVE`, влияющий на целостность документа (lock/unlock/merge/archive/reject), обязан быть выполнен с CAS.
- В AQL это выражается через:
  - сравнение `_rev` (ожидаемая ревизия приходит из `If-Match`)
  - `OPTIONS { ignoreRevs: false }`
- При конфликте `_rev` workflow возвращает `409 CONFLICT` (см. Раздел 2).

---

## 3.1. Сценарий: AI Analysis (Запуск Агента) — v2.1

Реализует паттерн **Dynamic Prompt Injection** с обработкой ошибок.

> В этом сценарии нет CAS-обновлений существующих документов (идут `INSERT` новых артефактов), поэтому `ignoreRevs` здесь не применяется.

### Входные данные (Webhook):
```json
{
  "target_atom_id": "atom_uuid_v5",
  "agent_role_key": "tech_lead"
}
```

### Алгоритм:

**Шаг 1. Fetch Context (ArangoDB Query)**
Получаем текст Атома и **Шаблон Промпта** одной выборкой.

```aql
LET atom = DOCUMENT(CONCAT('atoms/', @target_atom_id))

LET prompt = (
  FOR p IN prompts
  FILTER p.role_key == @agent_role_key AND p.active == true
  SORT p.version DESC
  LIMIT 1
  RETURN p
)[0]

LET issues_context = (
  @agent_role_key == "fixer" ? (
    FOR artifact IN INBOUND CONCAT('atoms/', @target_atom_id) semantic_links
      FILTER artifact.type == "issue" AND artifact.status == "open"
      RETURN {
        severity: artifact.severity,
        description: artifact.content
      }
  ) : []
)

RETURN {
  atom_exists: atom != null,
  prompt_exists: prompt != null,
  atom_text: atom ? atom.content : null,
  prompt: prompt,
  issues_context: issues_context
}
```

**Шаг 2. Prepare Payload (n8n Code Node)**
```javascript
const { atom_exists, prompt_exists, atom_text, prompt, issues_context } = $input.item.json;

if (!atom_exists) {
  return { json: { error: 'NOT_FOUND', message: 'Target atom not found' } };
}

if (!prompt_exists) {
  return { json: { error: 'NOT_FOUND', message: 'Active prompt not found for role_key' } };
}

let finalPrompt = prompt.template.replace('{{content}}', atom_text);

if (issues_context && issues_context.length > 0) {
  const issuesText = issues_context
    .map(i => `- [${String(i.severity).toUpperCase()}] ${i.description}`)
    .join('\n');
  finalPrompt = finalPrompt.replace('{{issues_context}}', issuesText);
}

return {
  json: {
    model: prompt.model_config.model,
    temperature: prompt.model_config.temperature,
    prompt: finalPrompt,
    response_format: prompt.model_config.response_format,

    // tracking
    prompt_id: prompt._id,
    target_atom_id: $('Webhook').item.json.target_atom_id,
    request_id: $execution.id
  }
};
```

**Шаг 3. AI Execution (HTTP Request -> Ollama)**
- Timeout: 60s
- Continue On Fail = true

**Шаг 4. Check Response (IF Node)**
Условие успеха:
- statusCode == 200
- есть response

**Шаг 5a. Success Branch: Save Results (ArangoDB Transaction)**
```aql
LET prompt_id = @prompt_id
LET target_atom_id = @target_atom_id
LET ai_response = @ai_response
LET now = DATE_NOW()

FOR item IN ai_response.issues
  LET new_artifact = INSERT {
    type: "issue",
    content: item.description,
    severity: item.severity,
    status: "open",
    source_model: @model,
    created_at: now
  } INTO artifacts RETURN NEW

  INSERT {
    _from: new_artifact._id,
    _to: CONCAT('atoms/', target_atom_id),
    type: "detected_in"
  } INTO semantic_links

  INSERT {
    _from: new_artifact._id,
    _to: prompt_id,
    type: "created_with",
    created_at: now
  } INTO created_with

RETURN { success: true, artifacts_created: LENGTH(ai_response.issues) }
```

**Шаг 5b. Error Branch: Save Error Artifact (ArangoDB Transaction)**
```aql
LET now = DATE_NOW()

LET error_code = (
  @statusCode == null ? "TIMEOUT" :
  @statusCode >= 500 ? "MODEL_ERROR" :
  @response_text LIKE "%invalid json%" ? "INVALID_JSON" :
  "NETWORK_ERROR"
)

LET error_artifact = INSERT {
  type: "ai_error",
  error_code: error_code,
  error_message: @error_message,
  status: "open",
  created_at: now,
  error_details: {
    prompt_id: @prompt_id,
    model: @model,
    temperature: @temperature,
    timeout_seconds: 60,
    request_id: @request_id,
    raw_response: @response_text
  }
} INTO artifacts RETURN NEW

INSERT {
  _from: error_artifact._id,
  _to: CONCAT('atoms/', @target_atom_id),
  type: "failed_for"
} INTO semantic_links

INSERT {
  _from: error_artifact._id,
  _to: @prompt_id,
  type: "created_with",
  created_at: now
} INTO created_with

RETURN { success: false, error_artifact_id: error_artifact._id }
```

---

## 3.2. Сценарий: Merge Proposal (Принятие Правки) — v2.1 CAS (CRITICAL)

Реализует иммутабельность, re-linking, auto-rebase и гарантирует отсутствие orphan `active` атомов.

### Входные данные (Webhook):
```json
{
  "winner_proposal_id": "atom_draft_x",
  "current_active_id": "atom_uuid_v5",
  "user_id": "user_123",

  "structure_edge_id": "structure_links/<edgeKey>",
  "expected_edge_rev": "_rev_from_structure_edge",

  "allow_outdated": false
}
```

### Алгоритм (ArangoDB Transaction):
```aql
LET winner_id = @winner_proposal_id
LET current_id = @current_active_id
LET user_id = @user_id
LET structure_edge_id = @structure_edge_id
LET expected_edge_rev = @expected_edge_rev
LET allow_outdated = @allow_outdated
LET now = DATE_NOW()

LET current_atom = DOCUMENT(CONCAT('atoms/', current_id))
LET winner_atom = DOCUMENT(CONCAT('atoms/', winner_id))
LET edge = DOCUMENT(structure_edge_id)

// 0) Existence
FILTER current_atom != null AND winner_atom != null AND edge != null

// 1) Lock check (treat expired locks as free)
LET lock_is_active = (current_atom.locked_until != null AND current_atom.locked_until > now)
FILTER !lock_is_active OR current_atom.locked_by == null OR current_atom.locked_by == user_id

// 2) Status checks
FILTER current_atom.status == "active"
FILTER winner_atom.status == "proposal"

// 3) Edge must point to current atom (stale request protection)
FILTER edge._to == CONCAT('atoms/', current_id)

// 4) Winner must be a proposal for current atom
LET winner_prop_edge = FIRST(
  FOR pe IN proposal_links
    FILTER pe._from == CONCAT('atoms/', winner_id)
    FILTER pe._to == CONCAT('atoms/', current_id)
    RETURN pe
)
FILTER winner_prop_edge != null
FILTER allow_outdated == true OR (winner_prop_edge.outdated != true)

// 5) CAS switch: update exactly the provided structure edge
LET switched_edge = FIRST(
  FOR e IN structure_links
    FILTER e._id == structure_edge_id
    FILTER e._rev == expected_edge_rev
    UPDATE e WITH { _to: CONCAT('atoms/', winner_id) } IN structure_links OPTIONS { ignoreRevs: false }
    RETURN NEW
)

// if CAS failed -> the transaction yields no result, caller maps to 409
FILTER switched_edge != null

// 6) Atom status changes
UPDATE current_id WITH { status: "archived", archived_at: now } IN atoms
UPDATE winner_id WITH { status: "active", activated_at: now } IN atoms

// 7) Revision link
INSERT {
  _from: CONCAT('atoms/', winner_id),
  _to: CONCAT('atoms/', current_id),
  type: "replaces",
  created_at: now
} INTO revision_links

// 8) Auto-rebase other proposals to new active
LET rebased = (
  FOR pe IN proposal_links
    FILTER pe._to == CONCAT('atoms/', current_id)
    FILTER pe._from != CONCAT('atoms/', winner_id)
    UPDATE pe WITH {
      _to: CONCAT('atoms/', winner_id),
      outdated: true,
      rebased_from: CONCAT('atoms/', current_id),
      rebased_at: now
    } IN proposal_links
    RETURN { id: pe._from, outdated: true }
)

// 9) Winner is no longer proposal: remove its proposal_link
FOR pe IN proposal_links
  FILTER pe._from == CONCAT('atoms/', winner_id)
  REMOVE pe IN proposal_links

RETURN {
  success: true,
  new_active_atom_id: winner_id,
  archived_atom_id: current_id,
  structure_edge_id: structure_edge_id,
  structure_edge_rev: switched_edge._rev,
  rebased_proposals_count: LENGTH(rebased),
  rebased_proposals: rebased
}
```

**Orphan prevention guarantees:**
- `winner_atom.status` становится `active` **только после успешного CAS-переключения** structure edge.
- Если CAS не прошёл, транзакция не коммитит изменения → caller получает `409 CONFLICT`.

---

## 3.3. Сценарий: Create Baseline (Снимок Версии) — v2.1

Фиксирует состояние документа "как есть" на данный момент.

**v2.1 Constraint:** прямые связи `docs/* -> atoms/*` запрещены. Workflow валидирует это до снапшота.

### Входные данные (Webhook):
```json
{
  "doc_id": "docs/doc_1",
  "version_tag": "v1.0",
  "title": "MVP Release"
}
```

### Алгоритм (ArangoDB Transaction):
```aql
LET doc_id = @doc_id
LET now = DATE_NOW()

// 0) Validation: forbid docs -> atoms edges
LET illegal = (
  FOR e IN structure_links
    FILTER e._from == doc_id
    FILTER LIKE(e._to, "atoms/%")
    RETURN e
)
FILTER LENGTH(illegal) == 0

// 1) Create baseline node
LET b = INSERT {
  doc_id: doc_id,
  tag: @version_tag,
  title: @title,
  frozen_at: now
} INTO baselines RETURN NEW

// 2) Recursive traversal doc -> ... -> atoms
LET snap = (
  FOR v, e, p IN 1..10 OUTBOUND doc_id structure_links
    FILTER IS_SAME_COLLECTION("atoms", v)
    FILTER v.status == "active"

    LET lastEdge = p.edges[-1]

    INSERT {
      _from: b._id,
      _to: v._id,
      order: lastEdge.order,
      type: "snapshot_item",
      snapshotted_at: now
    } INTO baseline_items

    RETURN v._id
)

RETURN {
  baseline_id: b._id,
  items_snapshotted: LENGTH(snap),
  frozen_at: b.frozen_at
}
```

---

## 3.4. Сценарий: Manual Proposal (Ручная правка) — v2.1

Создает альтернативную ветку, не меняя структуру документа.

### Входные данные (Webhook):
```json
{
  "target_active_id": "atom_uuid_v5",
  "new_content": "Исправленный текст...",
  "comment": "Убрал опечатку",
  "author": "user_123"
}
```

### Алгоритм (ArangoDB Transaction):
```aql
LET now = DATE_NOW()

LET draft = INSERT {
  content: @new_content,
  status: "proposal",
  author: @author,
  created_at: now
} INTO atoms RETURN NEW

INSERT {
  _from: draft._id,
  _to: CONCAT('atoms/', @target_active_id),
  type: "alternative",
  comment: @comment,
  outdated: false,
  rebased_from: null,
  rebased_at: null
} INTO proposal_links

RETURN { proposal_id: draft._id, status: "proposal" }
```

---

## 3.5. Сценарий: Reject Proposal (Отклонение) — v2.1 CAS

### Входные данные (Webhook):
```json
{
  "proposal_id": "atom_draft_y",
  "expected_proposal_rev": "_rev_from_atoms"
}
```

### Алгоритм (CAS UPDATE):
```aql
LET proposal_id = @proposal_id
LET expected_rev = @expected_proposal_rev
LET now = DATE_NOW()

LET updated = FIRST(
  FOR a IN atoms
    FILTER a._key == proposal_id
    FILTER a._rev == expected_rev
    UPDATE a WITH { status: "rejected", rejected_at: now } IN atoms OPTIONS { ignoreRevs: false }
    RETURN NEW
)

RETURN updated != null
  ? { success: true, proposal_rev: updated._rev }
  : { error: "REV_CONFLICT" }
```

---

## 3.6. Сценарий: Lock/Unlock Atom — v2.1 CAS (CRITICAL)

### 3.6.1. Lock Atom (CAS, no lock stealing)

**Входные данные (Webhook):**
```json
{
  "atom_id": "atom_uuid_v5",
  "user_id": "user_123",
  "expected_rev": "_rev_from_atoms"
}
```

**Алгоритм:**
```aql
LET atom_id = @atom_id
LET user_id = @user_id
LET expected_rev = @expected_rev
LET now = DATE_NOW()
LET new_until = DATE_ADD(now, 5, 'minutes')

LET atom = DOCUMENT(CONCAT('atoms/', atom_id))

// If lock is active -> must return 423 in API layer
LET lock_is_active = (atom.locked_by != null AND atom.locked_until != null AND atom.locked_until > now)
FILTER !lock_is_active

LET updated = FIRST(
  FOR a IN atoms
    FILTER a._key == atom_id
    FILTER a._rev == expected_rev
    UPDATE a WITH { locked_by: user_id, locked_until: new_until } IN atoms OPTIONS { ignoreRevs: false }
    RETURN NEW
)

RETURN updated != null
  ? { success: true, locked_until: updated.locked_until, atom_rev: updated._rev }
  : { error: "REV_CONFLICT" }
```

### 3.6.2. Unlock Atom (CAS + owner check)

**Входные данные (Webhook):**
```json
{
  "atom_id": "atom_uuid_v5",
  "user_id": "user_123",
  "expected_rev": "_rev_from_atoms"
}
```

**Алгоритм:**
```aql
LET atom_id = @atom_id
LET user_id = @user_id
LET expected_rev = @expected_rev

LET atom = DOCUMENT(CONCAT('atoms/', atom_id))

// Only owner can unlock (or atom already unlocked)
FILTER atom.locked_by == null OR atom.locked_by == user_id

LET updated = FIRST(
  FOR a IN atoms
    FILTER a._key == atom_id
    FILTER a._rev == expected_rev
    UPDATE a WITH { locked_by: null, locked_until: null } IN atoms OPTIONS { ignoreRevs: false }
    RETURN NEW
)

RETURN updated != null
  ? { success: true, atom_rev: updated._rev }
  : { error: "REV_CONFLICT" }
```

---

## 3.7. Сценарий: Archive Atom — v2.1 CAS

Архивирование заменяет удаление. Атом исчезает из документа (удаляется `structure_links`), но остаётся в БД.

### Входные данные (Webhook):
```json
{
  "atom_id": "atom_uuid_v5",
  "reason": "Требование отменено заказчиком",
  "expected_rev": "_rev_from_atoms",
  "user_id": "user_123"
}
```

### Алгоритм (ArangoDB Transaction):
```aql
LET atom_id = @atom_id
LET expected_rev = @expected_rev
LET now = DATE_NOW()

// 1) Baseline protection check
LET protected_baselines = (
  FOR baseline IN INBOUND CONCAT('atoms/', atom_id) baseline_items
    RETURN { id: baseline._id, tag: baseline.tag }
)
FILTER LENGTH(protected_baselines) == 0

// 2) Lock check (treat expired locks as free)
LET atom = DOCUMENT(CONCAT('atoms/', atom_id))
LET lock_is_active = (atom.locked_until != null AND atom.locked_until > now)
FILTER !lock_is_active OR atom.locked_by == null OR atom.locked_by == @user_id

// 3) CAS archive
LET archived = FIRST(
  FOR a IN atoms
    FILTER a._key == atom_id
    FILTER a._rev == expected_rev
    UPDATE a WITH { status: "archived", archived_at: now, archive_reason: @reason } IN atoms OPTIONS { ignoreRevs: false }
    RETURN NEW
)
FILTER archived != null

// 4) Remove from structure (Single Parent Invariant expects <=1 edge, но удаляем все на всякий случай)
FOR e IN structure_links
  FILTER e._to == CONCAT('atoms/', atom_id)
  REMOVE e IN structure_links

RETURN { success: true, archived_at: archived.archived_at, atom_rev: archived._rev }
```

**Если защищен baseline:** API layer возвращает `PROTECTED_BY_BASELINE` с перечнем baselines.

---

## 3.8. Cron: Unlock Expired Locks — v2.1

Запускается каждую минуту для автоматического снятия истекших блокировок.

**Cron Expression:** `* * * * *`

**Алгоритм (с `ignoreRevs:false` на документе из FOR):**
```aql
FOR atom IN atoms
  FILTER atom.locked_until != null AND atom.locked_until < DATE_NOW()

  UPDATE atom WITH { locked_by: null, locked_until: null } IN atoms OPTIONS { ignoreRevs: false }

  RETURN { id: atom._id, unlocked: true }
```

---

**Конец Раздела 3** ✅
