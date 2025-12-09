import { describe, test, expect, beforeEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DebugPanel } from '../DebugPanel';
import { apiLogger } from '../../../lib/apiLogger';
import type { ApiLogEntry } from '../../../lib/apiLogger';

// Mock apiLogger
vi.mock('../../../lib/apiLogger', () => ({
  apiLogger: {
    subscribe: vi.fn(),
  },
}));

const mockSubscribe = vi.fn();
(apiLogger.subscribe as typeof mockSubscribe) = mockSubscribe;

// Mock logs
const mockLogs: ApiLogEntry[] = [
  {
    id: '1',
    timestamp: '2023-01-01T00:00:00Z',
    method: 'GET',
    url: 'http://example.com',
    requestData: { action: 'test-action' },
    responseData: { success: true },
    status: 200,
    error: null,
    duration: 100,
    processed: false,
    correlationId: 'corr-1',
  },
  {
    id: '2',
    timestamp: '2023-01-01T00:01:00Z',
    method: 'POST',
    url: 'http://example.com/post',
    requestData: { action: '' },
    responseData: null,
    status: null,
    error: 'Network error',
    duration: 200,
    processed: true,
    correlationId: 'corr-2',
  },
  {
    id: '3',
    timestamp: '2023-01-01T00:02:00Z',
    method: 'PUT',
    url: 'http://example.com/put',
    requestData: { action: {} }, // Object as action
    responseData: null,
    status: 500,
    error: null,
    duration: 300,
    processed: false,
    correlationId: 'corr-3',
  },
];

describe('DebugPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('does not render when isOpen is false', () => {
    mockSubscribe.mockReturnValue(vi.fn());

    render(<DebugPanel isOpen={false} onClose={() => {}} />);

    // Component should not be rendered
    expect(screen.queryByText('Отладка API запросов')).not.toBeInTheDocument();
  });

  test('renders panel when isOpen is true', () => {
    mockSubscribe.mockReturnValue(vi.fn());
    mockSubscribe.mockImplementation((callback) => {
      callback(mockLogs);
      return vi.fn();
    });

    render(<DebugPanel isOpen={true} onClose={() => {}} />);

    expect(screen.getByText('Отладка API запросов')).toBeInTheDocument();
    expect(screen.getByText('Закрыть')).toBeInTheDocument();
  });

  test('displays action text correctly for string', () => {
    mockSubscribe.mockReturnValue(vi.fn());
    mockSubscribe.mockImplementation((callback) => {
      callback([mockLogs[0]]); // Only the one with string action
      return vi.fn();
    });

    render(<DebugPanel isOpen={true} onClose={() => {}} />);

    const table = screen.getByRole('table');
    expect(within(table).getByText('test-action')).toBeInTheDocument();
  });

  test('displays — for empty action', () => {
    mockSubscribe.mockReturnValue(vi.fn());
    mockSubscribe.mockImplementation((callback) => {
      callback([mockLogs[1]]); // Empty action
      return vi.fn();
    });

    render(<DebugPanel isOpen={true} onClose={() => {}} />);

    // Get all rows
    const rows = screen.getAllByRole('row');
    // Index 0 is <thead>, Index 1 is the first <tbody> row
    const dataRow = rows[1];

    // Get cells within that row
    const cells = within(dataRow).getAllByRole('cell');

    // The "Action" column is the 3rd column (Index 2)
    // Verify that SPECIFIC cell contains the dash
    expect(cells[2]).toHaveTextContent('—');
  });

  test('converts object action to string without crashing', () => {
    mockSubscribe.mockReturnValue(vi.fn());
    mockSubscribe.mockImplementation((callback) => {
      callback([mockLogs[2]]); // Object action
      return vi.fn();
    });

    render(<DebugPanel isOpen={true} onClose={() => {}} />);

    // Should render '[object Object]' instead of crashing
    const table = screen.getByRole('table');
    expect(within(table).getByText('[object Object]')).toBeInTheDocument();
  });

  test('shows "Нет логов для отображения" when no logs', () => {
    mockSubscribe.mockReturnValue(vi.fn());
    mockSubscribe.mockImplementation((callback) => {
      callback([]);
      return vi.fn();
    });

    render(<DebugPanel isOpen={true} onClose={() => {}} />);

    expect(screen.getByText('Нет логов для отображения')).toBeInTheDocument();
  });
});
