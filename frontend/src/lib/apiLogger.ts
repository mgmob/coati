export interface ApiLogEntry {
  id: string;
  timestamp: string;
  method: string;
  url: string;
  requestData: Record<string, unknown> | null;
  responseData: Record<string, unknown> | string | null;
  status: number | null;
  error: string | null;
  duration: number;
  processed: boolean; // Были ли данные успешно обработаны в компоненте
  reason?: string; // Причина почему не обработаны
  location?: string; // Компонент и контекст вызова
  expected?: string; // Описание ожидаемых данных
  correlationId?: string; // Уникальный идентификатор для связи запросов
}

class ApiLogger {
  private logs: ApiLogEntry[] = [];
  private listeners: ((logs: ApiLogEntry[]) => void)[] = [];
  private maxLogs = 100; // Лимит логов чтобы не перегружать память
  private currentLocation: string | undefined = undefined;
  private currentExpected: string | undefined = undefined;
  private currentCorrelationId: string | undefined = undefined;

  subscribe(listener: (logs: ApiLogEntry[]) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(listener => listener([...this.logs]));
  }

  logRequest(method: string, url: string, requestData: Record<string, unknown> | null): string {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const log: Partial<ApiLogEntry> = {
      id,
      timestamp: new Date().toISOString(),
      method,
      url,
      requestData,
      location: this.currentLocation,
      expected: this.currentExpected,
      correlationId: this.currentCorrelationId,
      duration: 0,
      processed: false,
    };
    this.logs.unshift(log as ApiLogEntry); // Добавить в начало
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }
    this.notify();
    // Очищаем текущие значения после использования
    this.currentLocation = undefined;
    this.currentExpected = undefined;
    this.currentCorrelationId = undefined;
    return id;
  }

  logResponse(logId: string, responseData: Record<string, unknown> | string | null, status: number | null, error: string | null, duration: number) {
    const log = this.logs.find(l => l.id === logId);
    if (log) {
      log.responseData = responseData;
      log.status = status;
      log.error = error;
      log.duration = duration;
      this.notify();
    }
  }

  markProcessed(logId: string, processed: boolean, reason?: string) {
    const log = this.logs.find(l => l.id === logId);
    if (log) {
      log.processed = processed;
      log.reason = reason;
      this.notify();
    }
  }

  markProcessedGlobally(action: string, processed: boolean, reason?: string) {
    // Найти последние логи по action
    const recentLogs = this.logs
      .filter(l => l.requestData?.action === action || l.url.includes(action))
      .slice(0, 10); // Последние 10
    recentLogs.forEach(log => {
      if (log.processed === false) { // Только если еще не обработан
        log.processed = processed;
        log.reason = reason;
        this.notify();
      }
    });
  }

  getLogs(): ApiLogEntry[] {
    return [...this.logs];
  }

  setCurrentLocation(location: string) {
    this.currentLocation = location;
  }

  setCurrentExpected(expected: string) {
    this.currentExpected = expected;
  }

  setCurrentCorrelationId(correlationId: string) {
    this.currentCorrelationId = correlationId;
  }

  clearLogs() {
    this.logs = [];
    this.notify();
  }

  // Враппер для fetch
  async wrappedFetch(url: RequestInfo | URL, options?: RequestInit): Promise<Response> {
    const method = (options?.method?.toUpperCase()) || 'GET';
    const logId = this.logRequest(method, url.toString(), options?.body ? JSON.parse(options.body.toString()) : null);
    const startTime = Date.now();

    try {
      const response = await fetch(url, options);
      const duration = Date.now() - startTime;

      // Пытаемся прочитать тело ответа без потребления
      let responseData: Record<string, unknown> | string | null = null;
      let responseClone: Response | null = null;

      if (response.ok) {
        try {
          responseClone = response.clone();
          const text = await responseClone.text();
          if (text) {
            try {
              responseData = JSON.parse(text);
            } catch {
              responseData = text;
            }
          }
        } catch {
          // Игнорируем ошибки чтения
        }
      }

      this.logResponse(logId, responseData, response.status, null, duration);

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logResponse(logId, null, null, error instanceof Error ? error.message : 'Unknown error', duration);
      throw error;
    }
  }
}

export const apiLogger = new ApiLogger();
