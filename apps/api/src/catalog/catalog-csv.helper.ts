export const CATALOG_CSV_COLUMNS = [
  'type', 'title', 'description', 'price', 'category', 'isActive',
  'durationMinutes', 'bufferBeforeMinutes', 'bufferAfterMinutes',
  'isBookable', 'unit', 'paymentPolicy', 'prepaymentValue',
] as const;

export function csvEscape(value: unknown) {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function csvStringify(columns: readonly string[], rows: Array<Record<string, unknown>>) {
  return [columns.join(','), ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(','))].join('\r\n');
}

/** Small RFC-4180 parser sufficient for UTF-8 uploads and quoted newlines. */
export function parseCsv(source: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let value = ''; let quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quoted) {
      if (char === '"' && source[index + 1] === '"') { value += '"'; index += 1; }
      else if (char === '"') quoted = false;
      else value += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') { row.push(value); value = ''; }
    else if (char === '\n') { row.push(value.replace(/\r$/, '')); rows.push(row); row = []; value = ''; }
    else value += char;
  }
  if (value || row.length) { row.push(value.replace(/\r$/, '')); rows.push(row); }
  return rows;
}
