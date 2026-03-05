/**
 * Format a number as currency using Intl.NumberFormat.
 * Uses the origin airport's currency code for all displays.
 */
export function formatCurrency(amount, currencyCode = 'USD', locale = undefined) {
  if (amount == null || isNaN(amount)) return '—';

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.round(amount));
  } catch {
    // Fallback for unknown currency codes
    return `${currencyCode} ${Math.round(amount).toLocaleString()}`;
  }
}

/**
 * Get a locale string appropriate for a currency code.
 * Falls back to 'en-US' for unknown currencies.
 */
export function getLocaleForCurrency(currencyCode) {
  const localeMap = {
    USD: 'en-US', EUR: 'de-DE', GBP: 'en-GB', JPY: 'ja-JP',
    AUD: 'en-AU', CAD: 'en-CA', CHF: 'de-CH', CNY: 'zh-CN',
    HKD: 'zh-HK', SGD: 'en-SG', SEK: 'sv-SE', NOK: 'nb-NO',
    DKK: 'da-DK', NZD: 'en-NZ', MXN: 'es-MX', BRL: 'pt-BR',
    ZAR: 'en-ZA', INR: 'hi-IN', KRW: 'ko-KR', THB: 'th-TH',
    MYR: 'ms-MY', IDR: 'id-ID', PHP: 'fil-PH', TRY: 'tr-TR',
    AED: 'ar-AE', SAR: 'ar-SA', QAR: 'ar-QA', EGP: 'ar-EG',
    KES: 'sw-KE', NGN: 'en-NG', COP: 'es-CO', PEN: 'es-PE',
    ARS: 'es-AR', CLP: 'es-CL', PLN: 'pl-PL', CZK: 'cs-CZ',
    HUF: 'hu-HU', RON: 'ro-RO', UAH: 'uk-UA', ILS: 'he-IL',
  };
  return localeMap[currencyCode] || 'en-US';
}
