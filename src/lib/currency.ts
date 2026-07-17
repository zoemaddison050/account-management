import { useState, useEffect } from 'react';

const EXCHANGE_RATES_KEY = 'primexchanges_forex_rates';
const RATES_TIMESTAMP_KEY = 'primexchanges_forex_timestamp';
const SELECTED_CURRENCY_KEY = 'primexchanges_selected_currency';

export interface ExchangeRates {
  [currencyCode: string]: number;
}

// In-memory cache fallback
let ratesCache: ExchangeRates = {
  USD: 1.0,
  EUR: 0.92,
  GBP: 0.78,
  AUD: 1.51,
  CAD: 1.37,
};

// Check if cache is fresh (less than 1 hour)
function isCacheFresh(): boolean {
  const timestamp = localStorage.getItem(RATES_TIMESTAMP_KEY);
  if (!timestamp) return false;
  const age = Date.now() - parseInt(timestamp, 10);
  return age < 60 * 60 * 1000; // 1 hour
}

// Fetch exchange rates from free open API
export async function fetchExchangeRates(): Promise<ExchangeRates> {
  if (isCacheFresh()) {
    const cached = localStorage.getItem(EXCHANGE_RATES_KEY);
    if (cached) {
      try {
        ratesCache = JSON.parse(cached);
        return ratesCache;
      } catch (e) {
        // Fallback to fetch
      }
    }
  }

  try {
    const response = await fetch('https://open.er-api.com/v6/latest/USD');
    if (!response.ok) throw new Error('Failed to fetch exchange rates');
    const data = await response.json();
    if (data && data.rates) {
      ratesCache = data.rates;
      localStorage.setItem(EXCHANGE_RATES_KEY, JSON.stringify(data.rates));
      localStorage.setItem(RATES_TIMESTAMP_KEY, Date.now().toString());
      return data.rates;
    }
  } catch (error) {
    console.warn('Using fallback exchange rates due to network/CORS error:', error);
  }

  return ratesCache;
}

export function getSelectedCurrency(): string {
  return localStorage.getItem(SELECTED_CURRENCY_KEY) || 'USD';
}

export function setSelectedCurrency(currency: string): void {
  localStorage.setItem(SELECTED_CURRENCY_KEY, currency);
  // Dispatch custom event to notify all components
  window.dispatchEvent(new CustomEvent('currency-changed', { detail: currency }));
}

export function convertCurrency(amountUsd: number, targetCurrency: string, rates: ExchangeRates = ratesCache): number {
  const rate = rates[targetCurrency] || 1.0;
  return amountUsd * rate;
}

export function useCurrency() {
  const [currency, setCurrencyState] = useState(getSelectedCurrency());
  const [rates, setRates] = useState<ExchangeRates>(ratesCache);

  useEffect(() => {
    // Initial load
    fetchExchangeRates().then(setRates).catch(console.error);

    const handleCurrencyChange = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      setCurrencyState(customEvent.detail || getSelectedCurrency());
    };

    window.addEventListener('currency-changed', handleCurrencyChange);
    return () => {
      window.removeEventListener('currency-changed', handleCurrencyChange);
    };
  }, []);

  const changeCurrency = (newCurrency: string) => {
    setSelectedCurrency(newCurrency);
    setCurrencyState(newCurrency);
  };

  const formatWithCurrency = (amountUsd: number) => {
    const converted = convertCurrency(amountUsd, currency, rates);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(converted);
  };

  return {
    currency,
    rates,
    setCurrency: changeCurrency,
    formatCurrency: formatWithCurrency,
  };
}
