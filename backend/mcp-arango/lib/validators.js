/**
 * Graph Validation Logic для ArangoDB
 * Проверяет целостность графа согласно Architecture Specification v2.1
 */

/**
 * Проверить Single Parent Invariant
 * Каждый atoms/* может иметь не более одного входящего ребра structure_links
 * @param {Object} db - ArangoDB database instance
 * @returns {Promise<Array>} - Массив проблем
 */
async function checkSingleParentInvariant(db) {
    const aql = `
        FOR atom IN atoms
            LET incoming = (
                FOR v, e IN INBOUND atom structure_links
                    FILTER e.type == "contains"
                    RETURN 1
            )
            FILTER LENGTH(incoming) > 1
            RETURN {
                atom_id: atom._key,
                atom_content_preview: SUBSTRING(atom.content, 0, 50),
                parents_count: LENGTH(incoming),
                issue: "Multiple parents detected - violates Single Parent Invariant"
            }
    `;

    const cursor = await db.query(aql);
    return await cursor.all();
}

/**
 * Проверить наличие orphaned nodes
 * Атомы без входящих связей (кроме proposal и archived)
 * @param {Object} db - ArangoDB database instance
 * @returns {Promise<Array>} - Массив проблем
 */
async function checkOrphanedNodes(db) {
    const aql = `
        FOR atom IN atoms
            FILTER atom.status == "active"
            LET incoming = (
                FOR v, e IN INBOUND atom structure_links
                    RETURN 1
            )
            FILTER LENGTH(incoming) == 0
            RETURN {
                atom_id: atom._key,
                atom_content_preview: SUBSTRING(atom.content, 0, 50),
                status: atom.status,
                issue: "Orphaned active atom - no incoming structure links"
            }
    `;

    const cursor = await db.query(aql);
    return await cursor.all();
}

/**
 * Проверить illegal связи docs -> atoms
 * Прямые связи от docs к atoms запрещены (только через sections)
 * @param {Object} db - ArangoDB database instance
 * @returns {Promise<Array>} - Массив проблем
 */
async function checkIllegalDocsToAtomsLinks(db) {
    const aql = `
        FOR edge IN structure_links
            FILTER STARTS_WITH(edge._from, 'docs/')
            FILTER STARTS_WITH(edge._to, 'atoms/')
            RETURN {
                edge_id: edge._key,
                from: edge._from,
                to: edge._to,
                issue: "Illegal direct link from docs to atoms - must go through sections"
            }
    `;

    const cursor = await db.query(aql);
    return await cursor.all();
}

/**
 * Проверить циклы в revision_links
 * Не должно быть циклических зависимостей в истории версий
 * @param {Object} db - ArangoDB database instance
 * @returns {Promise<Array>} - Массив проблем
 */
async function checkRevisionCycles(db) {
    const aql = `
        FOR atom IN atoms
            LET path = (
                FOR v, e, p IN 1..10 OUTBOUND atom revision_links
                    FILTER v._id == atom._id
                    RETURN p
            )
            FILTER LENGTH(path) > 0
            RETURN {
                atom_id: atom._key,
                cycle_length: LENGTH(path),
                issue: "Cycle detected in revision_links"
            }
    `;

    const cursor = await db.query(aql);
    return await cursor.all();
}

/**
 * Проверить proposal_links корректность
 * Proposals должны указывать на active атомы
 * @param {Object} db - ArangoDB database instance
 * @returns {Promise<Array>} - Массив проблем
 */
async function checkProposalLinks(db) {
    const aql = `
        FOR edge IN proposal_links
            LET sourceAtom = DOCUMENT(edge._from)
            LET targetAtom = DOCUMENT(edge._to)
            FILTER sourceAtom.status != "proposal" OR targetAtom.status != "active"
            RETURN {
                edge_id: edge._key,
                from: edge._from,
                from_status: sourceAtom.status,
                to: edge._to,
                to_status: targetAtom.status,
                issue: "Invalid proposal_link - source must be 'proposal', target must be 'active'"
            }
    `;

    const cursor = await db.query(aql);
    return await cursor.all();
}

/**
 * Проверить наличие parent_doc_id в sections (должно быть удалено в v2.1)
 * @param {Object} db - ArangoDB database instance
 * @returns {Promise<Array>} - Массив проблем
 */
async function checkParentDocIdRemoved(db) {
    const aql = `
        FOR section IN sections
            FILTER section.parent_doc_id != null
            RETURN {
                section_id: section._key,
                section_title: section.title,
                parent_doc_id: section.parent_doc_id,
                issue: "parent_doc_id field found - should be removed in v2.1"
            }
    `;

    const cursor = await db.query(aql);
    return await cursor.all();
}

/**
 * Главная функция валидации графа
 * Запускает все проверки и возвращает сводный отчет
 * @param {Object} db - ArangoDB database instance
 * @returns {Promise<Object>} - Результат валидации
 */
export async function validateGraph(db) {
    console.log('🔍 Starting graph validation...');

    const issues = [];

    try {
        // 1. Single Parent Invariant
        const singleParentIssues = await checkSingleParentInvariant(db);
        if (singleParentIssues.length > 0) {
            issues.push({
                category: 'Single Parent Invariant',
                count: singleParentIssues.length,
                severity: 'critical',
                items: singleParentIssues
            });
        }

        // 2. Orphaned Nodes
        const orphanedIssues = await checkOrphanedNodes(db);
        if (orphanedIssues.length > 0) {
            issues.push({
                category: 'Orphaned Nodes',
                count: orphanedIssues.length,
                severity: 'warning',
                items: orphanedIssues
            });
        }

        // 3. Illegal docs -> atoms links
        const illegalLinksIssues = await checkIllegalDocsToAtomsLinks(db);
        if (illegalLinksIssues.length > 0) {
            issues.push({
                category: 'Illegal Links',
                count: illegalLinksIssues.length,
                severity: 'critical',
                items: illegalLinksIssues
            });
        }

        // 4. Revision Cycles
        const revisionCyclesIssues = await checkRevisionCycles(db);
        if (revisionCyclesIssues.length > 0) {
            issues.push({
                category: 'Revision Cycles',
                count: revisionCyclesIssues.length,
                severity: 'critical',
                items: revisionCyclesIssues
            });
        }

        // 5. Proposal Links
        const proposalLinksIssues = await checkProposalLinks(db);
        if (proposalLinksIssues.length > 0) {
            issues.push({
                category: 'Proposal Links',
                count: proposalLinksIssues.length,
                severity: 'warning',
                items: proposalLinksIssues
            });
        }

        // 6. parent_doc_id removal check
        const parentDocIdIssues = await checkParentDocIdRemoved(db);
        if (parentDocIdIssues.length > 0) {
            issues.push({
                category: 'Schema v2.1 Compliance',
                count: parentDocIdIssues.length,
                severity: 'warning',
                items: parentDocIdIssues
            });
        }

        const ok = issues.length === 0;
        const totalIssues = issues.reduce((sum, cat) => sum + cat.count, 0);

        if (ok) {
            console.log('✅ Graph validation passed - no issues found');
        } else {
            console.log(`⚠️  Graph validation found ${totalIssues} issue(s) in ${issues.length} categories`);
        }

        return {
            ok,
            timestamp: new Date().toISOString(),
            totalIssues,
            categoriesWithIssues: issues.length,
            issues
        };

    } catch (error) {
        console.error('❌ Graph validation error:', error.message);
        return {
            ok: false,
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
}
