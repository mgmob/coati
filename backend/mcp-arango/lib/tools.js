import { validateGraph } from './validators.js';

/**
 * MCP Tools Implementation для ArangoDB
 * Предоставляет 5 основных инструментов для работы с БД
 */

/**
 * Tool 1: arango_query
 * Выполняет произвольный AQL запрос
 */
export const arangoQueryTool = {
    name: 'arango_query',
    description: 'Execute an AQL query against ArangoDB. Returns query results as JSON array.',
    inputSchema: {
        type: 'object',
        properties: {
            aql: {
                type: 'string',
                description: 'AQL query string to execute'
            },
            bindVars: {
                type: 'object',
                description: 'Bind variables for the query (optional)',
                default: {}
            }
        },
        required: ['aql']
    }
};

export async function handleArangoQuery(dbConnection, args) {
    const { aql, bindVars = {} } = args;

    try {
        const results = await dbConnection.query(aql, bindVars);
        return {
            success: true,
            resultsCount: results.length,
            results
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Tool 2: arango_create_index
 * Создает индекс на коллекции
 */
export const arangoCreateIndexTool = {
    name: 'arango_create_index',
    description: 'Create an index on a collection. Checks if index already exists before creating.',
    inputSchema: {
        type: 'object',
        properties: {
            collection: {
                type: 'string',
                description: 'Collection name'
            },
            fields: {
                type: 'array',
                items: { type: 'string' },
                description: 'Array of field names to index'
            },
            type: {
                type: 'string',
                enum: ['persistent', 'fulltext', 'unique'],
                description: 'Index type',
                default: 'persistent'
            },
            sparse: {
                type: 'boolean',
                description: 'Whether the index should be sparse (optional)',
                default: false
            }
        },
        required: ['collection', 'fields']
    }
};

export async function handleCreateIndex(dbConnection, args) {
    const { collection, fields, type = 'persistent', sparse = false } = args;

    try {
        const options = sparse ? { sparse: true } : {};
        const result = await dbConnection.createIndex(collection, fields, type, options);
        return {
            success: true,
            ...result
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Tool 3: arango_list_collections
 * Получает список всех коллекций с их статистикой
 */
export const arangoListCollectionsTool = {
    name: 'arango_list_collections',
    description: 'List all collections in the database with document counts.',
    inputSchema: {
        type: 'object',
        properties: {}
    }
};

export async function handleListCollections(dbConnection, args) {
    try {
        const collections = await dbConnection.listCollections();
        return {
            success: true,
            totalCollections: collections.length,
            collections
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Tool 4: arango_validate_graph
 * Запускает validation script для проверки целостности графа
 */
export const arangoValidateGraphTool = {
    name: 'arango_validate_graph',
    description: 'Run comprehensive graph validation checks according to Architecture Spec v2.1. Checks: Single Parent Invariant, orphaned nodes, illegal links, cycles, and schema compliance.',
    inputSchema: {
        type: 'object',
        properties: {}
    }
};

export async function handleValidateGraph(dbConnection, args) {
    try {
        const db = dbConnection.getDatabase();
        const result = await validateGraph(db);
        return {
            success: result.ok,
            ...result
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Tool 5: arango_get_stats
 * Получает статистику базы данных
 */
export const arangoGetStatsTool = {
    name: 'arango_get_stats',
    description: 'Get database statistics: total collections, document counts, collection types breakdown.',
    inputSchema: {
        type: 'object',
        properties: {}
    }
};

export async function handleGetStats(dbConnection, args) {
    try {
        const stats = await dbConnection.getStats();
        return {
            success: true,
            ...stats
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Экспорт всех tools для регистрации в MCP server
 */
export const tools = [
    arangoQueryTool,
    arangoCreateIndexTool,
    arangoListCollectionsTool,
    arangoValidateGraphTool,
    arangoGetStatsTool
];

/**
 * Обработчик вызова tools
 */
export async function handleToolCall(toolName, args, dbConnection) {
    switch (toolName) {
        case 'arango_query':
            return await handleArangoQuery(dbConnection, args);
        case 'arango_create_index':
            return await handleCreateIndex(dbConnection, args);
        case 'arango_list_collections':
            return await handleListCollections(dbConnection, args);
        case 'arango_validate_graph':
            return await handleValidateGraph(dbConnection, args);
        case 'arango_get_stats':
            return await handleGetStats(dbConnection, args);
        default:
            throw new Error(`Unknown tool: ${toolName}`);
    }
}
