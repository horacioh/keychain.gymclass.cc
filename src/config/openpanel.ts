export function openPanelApiUrl(override?: string) {
  return override?.trim().replace(/\/+$/, '') || 'https://openpanelapi.hhg.app';
}
