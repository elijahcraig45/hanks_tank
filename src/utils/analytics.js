export function formatPercent(value, digits = 1) {
  if (value == null || Number.isNaN(Number(value))) {
    return '—';
  }

  return `${(Number(value) * 100).toFixed(digits)}%`;
}

export function formatDecimal(value, digits = 3) {
  if (value == null || Number.isNaN(Number(value))) {
    return '—';
  }

  return Number(value).toFixed(digits);
}

export function formatEdgePoints(value, digits = 1) {
  if (value == null || Number.isNaN(Number(value))) {
    return '—';
  }

  return `${(Number(value) * 100).toFixed(digits)} pts`;
}

export function extractIsoDate(value) {
  if (!value) {
    return '';
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? '' : value.toISOString().split('T')[0];
  }

  if (typeof value === 'object') {
    if ('value' in value) {
      return extractIsoDate(value.value);
    }

    return '';
  }

  const normalized = String(value).trim();
  const isoMatch = normalized.match(/\d{4}-\d{2}-\d{2}/);
  if (isoMatch) {
    return isoMatch[0];
  }

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().split('T')[0];
}

export function formatIsoDateLabel(value, options = {}) {
  const isoDate = extractIsoDate(value);
  if (!isoDate) {
    return '—';
  }

  const [year, month, day] = isoDate.split('-').map(Number);
  if (!year || !month || !day) {
    return '—';
  }

  return new Date(year, month - 1, day).toLocaleDateString([], options);
}

export function shiftIsoDate(value, days) {
  const isoDate = extractIsoDate(value);
  if (!isoDate) {
    return '';
  }

  const date = new Date(`${isoDate}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + Number(days));
  return date.toISOString().split('T')[0];
}

export function subtractDaysFromIso(isoDate, days) {
  return shiftIsoDate(isoDate, -days);
}

export function mergeSearchParams(searchParams, updates) {
  const next = new URLSearchParams(searchParams);

  Object.entries(updates).forEach(([key, value]) => {
    if (
      value == null ||
      value === '' ||
      value === false ||
      value === 'all'
    ) {
      next.delete(key);
      return;
    }

    next.set(key, String(value));
  });

  return next;
}

function escapeCsvValue(value) {
  const stringValue = value == null ? '' : String(value);
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

export function downloadCsv(filename, columns, rows) {
  const header = columns.map((column) => escapeCsvValue(column.label)).join(',');
  const body = rows.map((row) =>
    columns.map((column) => escapeCsvValue(column.value(row))).join(',')
  );
  const csv = [header, ...body].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.setAttribute('download', filename);
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

