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

export function subtractDaysFromIso(isoDate, days) {
  const date = new Date(`${isoDate}T12:00:00`);
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
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

