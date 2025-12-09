// Utils for DebugPanel component

export const formatData = (data: Record<string, unknown> | string | null | undefined) => {
  if (!data) return '—';
  if (typeof data === 'string') return data;
  return JSON.stringify(data, null, 2);
};
