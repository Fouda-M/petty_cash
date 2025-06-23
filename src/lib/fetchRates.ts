import { Currency } from "@/lib/constants";

const BASE_URL = 'https://v6.exchangerate-api.com/v6';

// Returns map: CurrencyCode -> EGP value of 1 unit of that currency
export async function fetchRatesToEGP(base: Currency = Currency.EGP): Promise<Record<string, number>> {
  const apiKey = process.env.NEXT_PUBLIC_EXCHANGE_RATE_KEY;
  if (!apiKey) {
    throw new Error('ExchangeRate API key is missing');
  }

  // We fetch with base EGP, so response gives 1 EGP = X currency.
  const url = `${BASE_URL}/${apiKey}/latest/${base}`;
  const res = await fetch(url, { next: { revalidate: 60 * 60 } }); // revalidate hourly
  if (!res.ok) {
    throw new Error(`ExchangeRate API error: ${res.status}`);
  }
  const data = await res.json();
  const conv = data.conversion_rates as Record<string, number>;
  const result: Record<string, number> = {};
  // Convert to USD-per-unit rates by inversion
  for (const [code, value] of Object.entries(conv)) {
    if (value > 0) {
      result[code] = 1 / value;
    }
  }
  // Ensure EGP exactly 1
  result[Currency.EGP] = 1;
  return result;
}
