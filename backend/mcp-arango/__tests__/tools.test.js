import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    handleArangoQuery,
    handleCreateIndex,
    handleListCollections,
    handleValidateGraph,
    handleGetStats
} from '../lib/tools.js';

describe('MCP Tools - handleArangoQuery', () => {
    let mockDbConnection;

    beforeEach(() => {
        mockDbConnection = {
            query: vi.fn(),
            getDatabase: vi.fn()
        };
    });

    it('должен выполнить AQL запрос и вернуть результаты', async () => {
        const mockResults = [
            { _key: 'atom1', content: 'Test atom 1' },
            { _key: 'atom2', content: 'Test atom 2' }
        ];
        mockDbConnection.query.mockResolvedValue(mockResults);

        const result = await handleArangoQuery(mockDbConnection, {
            aql: 'FOR a IN atoms RETURN a',
            bindVars: {}
        });

        expect(result.success).toBe(true);
        expect(result.resultsCount).toBe(2);
        expect(result.results).toEqual(mockResults);
        expect(mockDbConnection.query).toHaveBeenCalledWith(
            'FOR a IN atoms RETURN a',
            {}
        );
    });

    it('должен передать bindVars в query', async () => {
        mockDbConnection.query.mockResolvedValue([]);

        await handleArangoQuery(mockDbConnection, {
            aql: 'FOR a IN atoms FILTER a.status == @status RETURN a',
            bindVars: { status: 'active' }
        });

        expect(mockDbConnection.query).toHaveBeenCalledWith(
            'FOR a IN atoms FILTER a.status == @status RETURN a',
            { status: 'active' }
        );
    });

    it('должен обработать ошибку AQL', async () => {
        mockDbConnection.query.mockRejectedValue(new Error('Syntax error in AQL'));

        const result = await handleArangoQuery(mockDbConnection, {
            aql: 'INVALID AQL',
            bindVars: {}
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('Syntax error');
    });

    it('должен использовать пустой объект для bindVars если не передан', async () => {
        mockDbConnection.query.mockResolvedValue([]);

        await handleArangoQuery(mockDbConnection, {
            aql: 'FOR a IN atoms RETURN a'
        });

        expect(mockDbConnection.query).toHaveBeenCalledWith(
            'FOR a IN atoms RETURN a',
            {}
        );
    });
});

describe('MCP Tools - handleCreateIndex', () => {
    let mockDbConnection;

    beforeEach(() => {
        mockDbConnection = {
            createIndex: vi.fn()
        };
    });

    it('должен создать новый индекс', async () => {
        mockDbConnection.createIndex.mockResolvedValue({
            status: 'created',
            message: 'Index created on atoms',
            index: { id: 'idx_123' }
        });

        const result = await handleCreateIndex(mockDbConnection, {
            collection: 'atoms',
            fields: ['status'],
            type: 'persistent'
        });

        expect(result.success).toBe(true);
        expect(result.status).toBe('created');
        expect(mockDbConnection.createIndex).toHaveBeenCalledWith(
            'atoms',
            ['status'],
            'persistent',
            {}
        );
    });

    it('должен вернуть exists если индекс уже существует', async () => {
        mockDbConnection.createIndex.mockResolvedValue({
            status: 'exists',
            message: 'Index already exists on atoms'
        });

        const result = await handleCreateIndex(mockDbConnection, {
            collection: 'atoms',
            fields: ['status']
        });

        expect(result.success).toBe(true);
        expect(result.status).toBe('exists');
    });

    it('должен передать sparse опцию', async () => {
        mockDbConnection.createIndex.mockResolvedValue({
            status: 'created'
        });

        await handleCreateIndex(mockDbConnection, {
            collection: 'atoms',
            fields: ['locked_by'],
            type: 'persistent',
            sparse: true
        });

        expect(mockDbConnection.createIndex).toHaveBeenCalledWith(
            'atoms',
            ['locked_by'],
            'persistent',
            { sparse: true }
        );
    });

    it('должен использовать type=persistent по умолчанию', async () => {
        mockDbConnection.createIndex.mockResolvedValue({ status: 'created' });

        await handleCreateIndex(mockDbConnection, {
            collection: 'atoms',
            fields: ['status']
        });

        expect(mockDbConnection.createIndex).toHaveBeenCalledWith(
            'atoms',
            ['status'],
            'persistent',
            {}
        );
    });

    it('должен обработать ошибку создания индекса', async () => {
        mockDbConnection.createIndex.mockRejectedValue(
            new Error('Collection not found')
        );

        const result = await handleCreateIndex(mockDbConnection, {
            collection: 'invalid_collection',
            fields: ['status']
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('Collection not found');
    });
});

describe('MCP Tools - handleListCollections', () => {
    let mockDbConnection;

    beforeEach(() => {
        mockDbConnection = {
            listCollections: vi.fn()
        };
    });

    it('должен вернуть список коллекций', async () => {
        const mockCollections = [
            { name: 'atoms', type: 'document', count: 100 },
            { name: 'structure_links', type: 'edge', count: 150 }
        ];
        mockDbConnection.listCollections.mockResolvedValue(mockCollections);

        const result = await handleListCollections(mockDbConnection, {});

        expect(result.success).toBe(true);
        expect(result.totalCollections).toBe(2);
        expect(result.collections).toEqual(mockCollections);
    });

    it('должен обработать ошибку получения списка', async () => {
        mockDbConnection.listCollections.mockRejectedValue(
            new Error('Database not connected')
        );

        const result = await handleListCollections(mockDbConnection, {});

        expect(result.success).toBe(false);
        expect(result.error).toContain('Database not connected');
    });

    it('должен работать с пустой базой данных', async () => {
        mockDbConnection.listCollections.mockResolvedValue([]);

        const result = await handleListCollections(mockDbConnection, {});

        expect(result.success).toBe(true);
        expect(result.totalCollections).toBe(0);
        expect(result.collections).toEqual([]);
    });
});

describe('MCP Tools - handleGetStats', () => {
    let mockDbConnection;

    beforeEach(() => {
        mockDbConnection = {
            getStats: vi.fn()
        };
    });

    it('должен вернуть статистику базы данных', async () => {
        const mockStats = {
            totalCollections: 14,
            documentCollections: 8,
            edgeCollections: 6,
            totalDocuments: 2500,
            collections: []
        };
        mockDbConnection.getStats.mockResolvedValue(mockStats);

        const result = await handleGetStats(mockDbConnection, {});

        expect(result.success).toBe(true);
        expect(result.totalCollections).toBe(14);
        expect(result.documentCollections).toBe(8);
        expect(result.edgeCollections).toBe(6);
        expect(result.totalDocuments).toBe(2500);
    });

    it('должен обработать ошибку получения статистики', async () => {
        mockDbConnection.getStats.mockRejectedValue(
            new Error('Failed to get stats')
        );

        const result = await handleGetStats(mockDbConnection, {});

        expect(result.success).toBe(false);
        expect(result.error).toContain('Failed to get stats');
    });
});

describe('MCP Tools - handleValidateGraph', () => {
    let mockDbConnection;

    beforeEach(() => {
        mockDbConnection = {
            getDatabase: vi.fn()
        };
    });

    it('должен вернуть успешный результат валидации', async () => {
        const mockDb = {
            query: vi.fn().mockResolvedValue({
                all: async () => []
            })
        };
        mockDbConnection.getDatabase.mockReturnValue(mockDb);

        const result = await handleValidateGraph(mockDbConnection, {});

        expect(result.success).toBe(true);
        expect(result.ok).toBe(true);
        expect(result.totalIssues).toBe(0);
        expect(result.issues).toEqual([]);
    });

    it('должен обработать ошибку валидации', async () => {
        mockDbConnection.getDatabase.mockImplementation(() => {
            throw new Error('Database not connected');
        });

        const result = await handleValidateGraph(mockDbConnection, {});

        expect(result.success).toBe(false);
        expect(result.error).toContain('Database not connected');
    });
});
