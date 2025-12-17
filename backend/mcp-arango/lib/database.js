import { Database } from 'arangojs';

/**
 * ArangoDB Database Connection Wrapper
 * Предоставляет безопасное подключение к ArangoDB с обработкой ошибок
 */
export class ArangoDBConnection {
    constructor() {
        this.db = null;
        this.isConnected = false;
    }

    /**
     * Подключение к ArangoDB
     * @returns {Promise<Database>}
     */
    async connect() {
        try {
            const url = process.env.ARANGO_URL || 'http://localhost:8529';
            const dbName = process.env.ARANGO_DB || 'coati_dev';
            const username = process.env.ARANGO_USERNAME || 'root';
            const password = process.env.ARANGO_PASSWORD || '';

            this.db = new Database({
                url,
                databaseName: dbName,
                auth: { username, password }
            });

            // Проверка подключения
            await this.db.version();
            this.isConnected = true;

            console.log(`✅ Connected to ArangoDB: ${url}/${dbName}`);
            return this.db;
        } catch (error) {
            this.isConnected = false;
            console.error('❌ Failed to connect to ArangoDB:', error.message);
            throw new Error(`ArangoDB connection failed: ${error.message}`);
        }
    }

    /**
     * Получить инстанс базы данных
     * @returns {Database}
     */
    getDatabase() {
        if (!this.isConnected || !this.db) {
            throw new Error('Database not connected. Call connect() first.');
        }
        return this.db;
    }

    /**
     * Выполнить AQL запрос
     * @param {string} aql - AQL запрос
     * @param {Object} bindVars - Параметры запроса
     * @returns {Promise<Array>}
     */
    async query(aql, bindVars = {}) {
        try {
            const db = this.getDatabase();
            const cursor = await db.query(aql, bindVars);
            return await cursor.all();
        } catch (error) {
            console.error('❌ AQL Query Error:', error.message);
            throw new Error(`AQL query failed: ${error.message}`);
        }
    }

    /**
     * Получить список всех коллекций
     * @returns {Promise<Array>}
     */
    async listCollections() {
        try {
            const db = this.getDatabase();
            const collections = await db.collections();

            const result = [];
            for (const collection of collections) {
                const count = await collection.count();
                result.push({
                    name: collection.name,
                    type: collection.type === 2 ? 'document' : 'edge',
                    count: count.count
                });
            }

            return result.sort((a, b) => a.name.localeCompare(b.name));
        } catch (error) {
            console.error('❌ List Collections Error:', error.message);
            throw new Error(`Failed to list collections: ${error.message}`);
        }
    }

    /**
     * Создать индекс
     * @param {string} collectionName - Имя коллекции
     * @param {Array<string>} fields - Поля для индекса
     * @param {string} type - Тип индекса (persistent, fulltext, unique)
     * @param {Object} options - Дополнительные опции
     * @returns {Promise<Object>}
     */
    async createIndex(collectionName, fields, type = 'persistent', options = {}) {
        try {
            const db = this.getDatabase();
            const collection = db.collection(collectionName);

            // Проверяем, существует ли уже такой индекс
            const indexes = await collection.indexes();
            const existingIndex = indexes.find(idx =>
                JSON.stringify(idx.fields) === JSON.stringify(fields) &&
                idx.type === type
            );

            if (existingIndex) {
                return {
                    status: 'exists',
                    message: `Index already exists on ${collectionName}`,
                    index: existingIndex
                };
            }

            // Создаем индекс
            const indexOptions = { type, fields, ...options };
            const newIndex = await collection.ensureIndex(indexOptions);

            return {
                status: 'created',
                message: `Index created on ${collectionName}`,
                index: newIndex
            };
        } catch (error) {
            console.error('❌ Create Index Error:', error.message);
            throw new Error(`Failed to create index: ${error.message}`);
        }
    }

    /**
     * Получить статистику базы данных
     * @returns {Promise<Object>}
     */
    async getStats() {
        try {
            const collections = await this.listCollections();

            let totalDocuments = 0;
            let totalCollections = collections.length;
            let documentCollections = 0;
            let edgeCollections = 0;

            for (const coll of collections) {
                totalDocuments += coll.count;
                if (coll.type === 'document') documentCollections++;
                if (coll.type === 'edge') edgeCollections++;
            }

            return {
                totalCollections,
                documentCollections,
                edgeCollections,
                totalDocuments,
                collections
            };
        } catch (error) {
            console.error('❌ Get Stats Error:', error.message);
            throw new Error(`Failed to get stats: ${error.message}`);
        }
    }

    /**
     * Закрыть соединение
     */
    async close() {
        if (this.db) {
            this.db.close();
            this.isConnected = false;
            console.log('✅ ArangoDB connection closed');
        }
    }
}

// Экспорт singleton instance
export const dbConnection = new ArangoDBConnection();
