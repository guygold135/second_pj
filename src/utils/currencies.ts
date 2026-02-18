/**
 * Common currencies for the app currency selector.
 * Format: ISO 4217 code, display name, and optional symbol override (otherwise Intl uses default).
 */
export interface CurrencyOption {
  code: string
  name: string
}

export const CURRENCIES: CurrencyOption[] = [
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'JPY', name: 'Japanese Yen' },
  { code: 'CNY', name: 'Chinese Yuan' },
  { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'AUD', name: 'Australian Dollar' },
  { code: 'CHF', name: 'Swiss Franc' },
  { code: 'INR', name: 'Indian Rupee' },
  { code: 'BRL', name: 'Brazilian Real' },
  { code: 'ZAR', name: 'South African Rand' },
  { code: 'MXN', name: 'Mexican Peso' },
  { code: 'KRW', name: 'South Korean Won' },
  { code: 'HKD', name: 'Hong Kong Dollar' },
  { code: 'SGD', name: 'Singapore Dollar' },
  { code: 'NOK', name: 'Norwegian Krone' },
  { code: 'SEK', name: 'Swedish Krona' },
  { code: 'DKK', name: 'Danish Krone' },
  { code: 'PLN', name: 'Polish Złoty' },
  { code: 'THB', name: 'Thai Baht' },
  { code: 'IDR', name: 'Indonesian Rupiah' },
  { code: 'HUF', name: 'Hungarian Forint' },
  { code: 'CZK', name: 'Czech Koruna' },
  { code: 'ILS', name: 'Israeli New Shekel' },
  { code: 'CLP', name: 'Chilean Peso' },
  { code: 'PHP', name: 'Philippine Peso' },
  { code: 'AED', name: 'UAE Dirham' },
  { code: 'COP', name: 'Colombian Peso' },
  { code: 'SAR', name: 'Saudi Riyal' },
  { code: 'MYR', name: 'Malaysian Ringgit' },
  { code: 'RON', name: 'Romanian Leu' },
  { code: 'TRY', name: 'Turkish Lira' },
  { code: 'EGP', name: 'Egyptian Pound' },
  { code: 'NGN', name: 'Nigerian Naira' },
  { code: 'PKR', name: 'Pakistani Rupee' },
  { code: 'BGN', name: 'Bulgarian Lev' },
  { code: 'HRK', name: 'Croatian Kuna' },
  { code: 'RUB', name: 'Russian Ruble' },
  { code: 'ARS', name: 'Argentine Peso' },
  { code: 'PEN', name: 'Peruvian Sol' },
  { code: 'VND', name: 'Vietnamese Dong' },
  { code: 'UAH', name: 'Ukrainian Hryvnia' },
  { code: 'NZD', name: 'New Zealand Dollar' },
  { code: 'QAR', name: 'Qatari Riyal' },
  { code: 'KWD', name: 'Kuwaiti Dinar' },
  { code: 'BDT', name: 'Bangladeshi Taka' },
  { code: 'MAD', name: 'Moroccan Dirham' },
  { code: 'JMD', name: 'Jamaican Dollar' },
  { code: 'GHS', name: 'Ghanaian Cedi' },
  { code: 'KES', name: 'Kenyan Shilling' },
  { code: 'ETB', name: 'Ethiopian Birr' },
  { code: 'TWD', name: 'New Taiwan Dollar' },
  { code: 'CRC', name: 'Costa Rican Colón' },
  { code: 'UYU', name: 'Uruguayan Peso' },
  { code: 'BOB', name: 'Bolivian Boliviano' },
  { code: 'GTQ', name: 'Guatemalan Quetzal' },
  { code: 'DOP', name: 'Dominican Peso' },
  { code: 'HNL', name: 'Honduran Lempira' },
  { code: 'NIO', name: 'Nicaraguan Córdoba' },
  { code: 'PYG', name: 'Paraguayan Guaraní' },
  { code: 'SVC', name: 'Salvadoran Colón' },
  { code: 'LKR', name: 'Sri Lankan Rupee' },
  { code: 'NPR', name: 'Nepalese Rupee' },
  { code: 'MMK', name: 'Myanmar Kyat' },
  { code: 'KHR', name: 'Cambodian Riel' },
  { code: 'LAK', name: 'Lao Kip' },
  { code: 'MNT', name: 'Mongolian Tugrik' },
  { code: 'GEL', name: 'Georgian Lari' },
  { code: 'AMD', name: 'Armenian Dram' },
  { code: 'AZN', name: 'Azerbaijani Manat' },
  { code: 'BHD', name: 'Bahraini Dinar' },
  { code: 'OMR', name: 'Omani Rial' },
  { code: 'JOD', name: 'Jordanian Dinar' },
  { code: 'LBP', name: 'Lebanese Pound' },
  { code: 'IQD', name: 'Iraqi Dinar' },
  { code: 'IRR', name: 'Iranian Rial' },
  { code: 'XAF', name: 'Central African CFA Franc' },
  { code: 'XOF', name: 'West African CFA Franc' },
  { code: 'TND', name: 'Tunisian Dinar' },
  { code: 'LYD', name: 'Libyan Dinar' },
  { code: 'RWF', name: 'Rwandan Franc' },
  { code: 'TZS', name: 'Tanzanian Shilling' },
  { code: 'UGX', name: 'Ugandan Shilling' },
  { code: 'ZMW', name: 'Zambian Kwacha' },
  { code: 'BWP', name: 'Botswana Pula' },
  { code: 'MUR', name: 'Mauritian Rupee' },
  { code: 'ISK', name: 'Icelandic Króna' },
  { code: 'RSD', name: 'Serbian Dinar' },
  { code: 'MKD', name: 'Macedonian Denar' },
  { code: 'ALL', name: 'Albanian Lek' },
  { code: 'BAM', name: 'Bosnia-Herzegovina Convertible Mark' },
  { code: 'MDL', name: 'Moldovan Leu' },
  { code: 'GIP', name: 'Gibraltar Pound' },
  { code: 'FJD', name: 'Fijian Dollar' },
  { code: 'XCD', name: 'East Caribbean Dollar' },
  { code: 'TTD', name: 'Trinidad and Tobago Dollar' },
  { code: 'BBD', name: 'Barbadian Dollar' },
  { code: 'BND', name: 'Brunei Dollar' },
]

const DEFAULT_CURRENCY = 'USD'
const STORAGE_KEY = 'app_currency'

export function getStoredCurrency(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && CURRENCIES.some((c) => c.code === stored)) return stored
  } catch (_) {}
  return DEFAULT_CURRENCY
}

export function setStoredCurrency(code: string): void {
  try {
    if (CURRENCIES.some((c) => c.code === code)) localStorage.setItem(STORAGE_KEY, code)
  } catch (_) {}
}

export function formatMoneyWithCurrency(amount: number, currencyCode: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${currencyCode} ${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
  }
}
