import { useState, useEffect, useMemo } from 'react';
import type { ApiLogEntry } from '../../lib/apiLogger';
import { apiLogger } from '../../lib/apiLogger';
import { Card } from '../atoms/Card';
import { Button } from '../atoms/Button';
import { Badge } from '../atoms/Badge';

interface DebugPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DebugPanel({ isOpen, onClose }: DebugPanelProps) {
  const [logs, setLogs] = useState<ApiLogEntry[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'error' | 'unprocessed'>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [selectedLogs, setSelectedLogs] = useState<Set<string>>(new Set());

  useEffect(() => {
    const unsubscribe = apiLogger.subscribe(setLogs);
    return unsubscribe;
  }, []);

  const filteredLogs = useMemo(() => {
    let filtered = logs;
    if (statusFilter === 'success') {
      filtered = logs.filter(log => log.status && log.status < 400);
    } else if (statusFilter === 'error') {
      filtered = logs.filter(log => log.error || (log.status && log.status >= 400));
    } else if (statusFilter === 'unprocessed') {
      filtered = logs.filter(log => !log.processed);
    }

    if (actionFilter !== 'all') {
      filtered = filtered.filter(log => log.requestData?.action === actionFilter);
    }

    return filtered;
  }, [logs, statusFilter, actionFilter]);

  const uniqueActions = Array.from(new Set(logs.map(log => log.requestData?.action).filter(Boolean))) as string[];

  const formatData = (data: Record<string, unknown> | string | null) => {
    if (!data) return '—';
    if (typeof data === 'string') return data;
    return JSON.stringify(data, null, 2);
  };

  const getStatusVariant = (log: ApiLogEntry): 'success' | 'error' | 'warning' => {
    if (log.error) return 'error';
    if (log.status && log.status >= 400) return 'error';
    if (log.status && log.status < 400) return 'success';
    return 'warning';
  };



  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold">Отладка API запросов</h2>
          <Button onClick={onClose} variant="secondary">Закрыть</Button>
        </div>

        <div className="flex gap-4 p-4 border-b">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Статус:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'success' | 'error' | 'unprocessed')}
              className="px-3 py-1 border rounded text-sm"
            >
              <option value="all">Все</option>
              <option value="success">Успешные</option>
              <option value="error">Ошибка</option>
              <option value="unprocessed">Необработанные</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Действие:</label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-3 py-1 border rounded text-sm"
            >
              <option value="all">Все</option>
              {uniqueActions.map(action => (
                <option key={action} value={action}>{action}</option>
              ))}
            </select>
          </div>

          <Button
            onClick={() => {
              const selectedData = filteredLogs
                .filter(log => selectedLogs.has(log.id))
                .map(log => ({
                  correlationId: log.correlationId,
                  timestamp: log.timestamp,
                  location: log.location,
                  expected: log.expected,
                  action: log.requestData?.action,
                  method: log.method,
                  status: log.status,
                  duration: log.duration,
                  processed: log.processed,
                  request: log.requestData,
                  response: log.responseData,
                  error: log.error
                }));
              navigator.clipboard.writeText(JSON.stringify(selectedData, null, 2));
            }}
            disabled={selectedLogs.size === 0}
            variant="secondary"
            size="sm"
          >
            Копировать выбранное
          </Button>

          <Button
            onClick={() => apiLogger.clearLogs()}
            variant="secondary"
            size="sm"
          >
            Очистить логи
          </Button>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-2 text-left">
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedLogs(new Set(filteredLogs.map(log => log.id)));
                      } else {
                        setSelectedLogs(new Set());
                      }
                    }}
                    checked={filteredLogs.length > 0 && selectedLogs.size === filteredLogs.length}
                  />
                </th>
                <th className="px-4 py-2 text-left">Время</th>
                <th className="px-4 py-2 text-left">Действие</th>
                <th className="px-4 py-2 text-left">Метод</th>
                <th className="px-4 py-2 text-left">Статус</th>
                <th className="px-4 py-2 text-left">Длительность</th>
                <th className="px-4 py-2 text-left">Обработан</th>
                <th className="px-4 py-2 text-left w-1/6">Запрос</th>
                <th className="px-4 py-2 text-left w-1/6">Ожидаемые данные</th>
                <th className="px-4 py-2 text-left w-1/3">Ответ</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <input
                      type="checkbox"
                      checked={selectedLogs.has(log.id)}
                      onChange={(e) => {
                        const newSelected = new Set(selectedLogs);
                        if (e.target.checked) {
                          newSelected.add(log.id);
                        } else {
                          newSelected.delete(log.id);
                        }
                        setSelectedLogs(newSelected);
                      }}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <div>
                      {new Date(log.timestamp).toLocaleTimeString()}
                      <br />
                      <span className="text-gray-500 text-xs">
                        {log.correlationId}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <div>
                      {log.requestData?.action || '—'}
                      <br />
                      <span className="text-gray-500 text-xs">
                        {log.location}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2">{log.method}</td>
                  <td className="px-4 py-2">
                    <Badge variant={getStatusVariant(log)}>
                      {log.status?.toString() || (log.error ? 'Ошибка' : '—')}
                    </Badge>
                  </td>
                  <td className="px-4 py-2">{log.duration}ms</td>
                  <td className="px-4 py-2">
                    <Badge variant={log.processed ? 'success' : 'warning'}>
                      {log.processed ? 'Да' : 'Нет'}
                    </Badge>
                  </td>
                  <td className="px-4 py-2">
                    <pre className="text-xs bg-gray-100 p-2 rounded max-h-32 overflow-y-auto">
                      {formatData(log.requestData)}
                    </pre>
                  </td>
                  <td className="px-4 py-2">
                    <pre className="text-xs bg-gray-100 p-2 rounded max-h-32 overflow-y-auto">
                      {log.expected || '—'}
                    </pre>
                  </td>
                  <td className="px-4 py-2">
                    <pre className="text-xs bg-gray-100 p-2 rounded max-h-32 overflow-y-auto">
                      {log.error ? `Ошибка: ${log.error}` : formatData(log.responseData)}
                    </pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredLogs.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              Нет логов для отображения
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
