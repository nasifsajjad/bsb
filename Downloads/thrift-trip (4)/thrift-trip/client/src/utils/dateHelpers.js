/**
 * Format a YYYY-MM-DD date string to a human-readable format.
 */
export function formatDate(dateStr, format = 'medium') {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00');
  if (isNaN(date)) return dateStr;

  if (format === 'short') {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  if (format === 'long') {
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' });
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Get today's date as a YYYY-MM-DD string.
 */
export function getTodayStr() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get the date N days from today as YYYY-MM-DD.
 */
export function getDateInDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

/**
 * Calculate the number of days between two date strings.
 */
export function daysBetween(start, end) {
  const a = new Date(start);
  const b = new Date(end);
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}
