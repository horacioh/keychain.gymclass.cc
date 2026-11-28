export function openPanelApiUrl(override?: string) {
  return override?.trim().replace(/\/+$/, '') || 'https://openpanel.hhg.app/api';
}
