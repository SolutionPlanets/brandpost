const CACHE_KEY = 'usd_inr_rate_cache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

interface RateCache {
  rate: number;
  timestamp: number;
}

export async function getUSDToINRRate(): Promise<number> {
  const defaultRate = 83.3;

  if (typeof window === 'undefined') return defaultRate;

  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { rate, timestamp }: RateCache = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DURATION) {
        return rate;
      }
    }

    const response = await fetch('https://open.er-api.com/v6/latest/USD');
    const data = await response.json();
    
    if (data && data.rates && data.rates.INR) {
      const rate = data.rates.INR;
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        rate,
        timestamp: Date.now()
      }));
      return rate;
    }
  } catch (error) {
    console.error('Failed to fetch exchange rate:', error);
  }

  return defaultRate;
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}
