#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';

import { dbConnection } from './lib/database.js';
import { tools, handleToolCall } from './lib/tools.js';

/**
 * MCP Server для управления ArangoDB в проекте Coati
 * Предоставляет 5 инструментов для работы с графовой БД
 */

class ArangoMCPServer {
    constructor() {
        this.server = new Server(
            {
                name: 'mcp-arango',
                version: '1.0.0'
            },
            {
                capabilities: {
                    tools: {}
                }
            }
        );

        this.setupHandlers();
        this.setupErrorHandling();
    }

    setupErrorHandling() {
        this.server.onerror = (error) => {
            console.error('[MCP Error]', error);
        };

        process.on('SIGINT', async () => {
            await dbConnection.close();
            process.exit(0);
        });

        process.on('SIGTERM', async () => {
            await dbConnection.close();
            process.exit(0);
        });
    }

    setupHandlers() {
        // Handler для получения списка доступных tools
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            return {
                tools: tools
            };
        });

        // Handler для вызова tools
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;

            try {
                // Проверяем подключение к БД
                if (!dbConnection.isConnected) {
                    await dbConnection.connect();
                }

                // Выполняем tool
                const result = await handleToolCall(name, args || {}, dbConnection);

                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(result, null, 2)
                        }
                    ]
                };
            } catch (error) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({
                                success: false,
                                error: error.message,
                                toolName: name
                            }, null, 2)
                        }
                    ],
                    isError: true
                };
            }
        });
    }

    async run() {
        // Подключаемся к ArangoDB при старте
        try {
            await dbConnection.connect();
            console.log('🚀 MCP-Arango server started');
            console.log('📦 Available tools:', tools.map(t => t.name).join(', '));
        } catch (error) {
            console.error('❌ Failed to connect to ArangoDB on startup:', error.message);
            console.log('⚠️  Server will try to reconnect on first tool call');
        }

        const transport = new StdioServerTransport();
        await this.server.connect(transport);

        console.log('✅ MCP-Arango server ready for requests');
    }
}

// Запуск сервера
const server = new ArangoMCPServer();
server.run().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
