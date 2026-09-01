interface ExchangeRateResponse {
    result: string;
    provider: string;
    documentation: string;
    terms_of_use: string;
    time_last_update_unix: number;
    time_last_update_utc: string;
    time_next_update_unix: number;
    time_next_update_utc: string;
    time_eol_unix: number;
    base_code: string;
    rates: {
        [key: string]: number;
    };
}

// Cache for exchange rates to avoid too many API calls
let exchangeRateCacheCOP: { rate: number; timestamp: number } | null = null;
let exchangeRateCacheGTQ: { rate: number; timestamp: number } | null = null;
const CACHE_DURATION = 3600000; // 1 hour in milliseconds

/**
 * Fetches the EUR to COP exchange rate from the exchange rate API
 * Uses caching to avoid excessive API calls
 */
export async function getEurToCopRate(): Promise<number> {
    // Check cache first
    if (exchangeRateCacheCOP && Date.now() - exchangeRateCacheCOP.timestamp < CACHE_DURATION) {
        return exchangeRateCacheCOP.rate;
    }

    try {
        const response = await fetch('https://open.er-api.com/v6/latest/EUR', {
            headers: {
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`Exchange rate API error: ${response.status}`);
        }

        const data: ExchangeRateResponse = await response.json();

        if (data.result !== 'success' || !data.rates.COP) {
            throw new Error('Invalid exchange rate data');
        }

        const rate = data.rates.COP;

        // Update cache
        exchangeRateCacheCOP = {
            rate,
            timestamp: Date.now(),
        };

        console.log(`[CURRENCY] Fetched EUR to COP rate: ${rate}`);
        return rate;
    } catch (error) {
        console.error('[CURRENCY] Error fetching exchange rate COP:', error);
        return 4600;
    }
}

/**
 * Fetches the EUR to GTQ (Guatemala Quetzal) exchange rate
 */
export async function getEurToGtqRate(): Promise<number> {
    if (exchangeRateCacheGTQ && Date.now() - exchangeRateCacheGTQ.timestamp < CACHE_DURATION) {
        return exchangeRateCacheGTQ.rate;
    }

    try {
        const response = await fetch('https://open.er-api.com/v6/latest/EUR', {
            headers: {
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`Exchange rate API error: ${response.status}`);
        }

        const data: ExchangeRateResponse = await response.json();

        if (data.result !== 'success' || !data.rates.GTQ) {
            throw new Error('Invalid exchange rate data for GTQ');
        }

        const rate = data.rates.GTQ;

        exchangeRateCacheGTQ = {
            rate,
            timestamp: Date.now(),
        };

        console.log(`[CURRENCY] Fetched EUR to GTQ rate: ${rate}`);
        return rate;
    } catch (error) {
        console.error('[CURRENCY] Error fetching exchange rate GTQ:', error);
        return 8.85; // Default fallback: ~8.85 GTQ per EUR
    }
}

/**
 * Converts EUR amount to COP using current exchange rate
 */
export async function convertEurToCop(eurAmount: number): Promise<number> {
    const rate = await getEurToCopRate();
    return eurAmount * rate;
}

/**
 * Converts EUR amount to GTQ using current exchange rate
 */
export async function convertEurToGtq(eurAmount: number): Promise<number> {
    const rate = await getEurToGtqRate();
    return eurAmount * rate;
}

/**
 * Get IVA rate based on country
 */
export function getIvaRate(country: 'spain' | 'colombia' | 'guatemala'): number {
    if (country === 'spain') return 0.21;     // Spain: 21%
    if (country === 'colombia') return 0.19;  // Colombia: 19%
    if (country === 'guatemala') return 0.12; // Guatemala: 12%
    return 0.21;
}

export interface CurrencyConfig {
    code: 'EUR' | 'COP' | 'GTQ';
    symbol: string;
    label: string;
    flag: string;
}

export const CURRENCY_OPTIONS: CurrencyConfig[] = [
    { code: 'EUR', symbol: '€', label: 'Euro (España)', flag: '🇪🇸' },
    { code: 'COP', symbol: '$', label: 'Peso Colombiano (Colombia)', flag: '🇨🇴' },
    { code: 'GTQ', symbol: 'Q', label: 'Quetzal (Guatemala)', flag: '🇬🇹' },
];

/**
 * Format currency amount with symbol and proper locale formatting
 */
export function formatCurrency(amount: number, currency: 'EUR' | 'COP' | 'GTQ' = 'EUR'): string {
    if (isNaN(amount)) amount = 0;
    
    switch (currency) {
        case 'COP':
            return `$ ${Math.round(amount).toLocaleString('es-CO')}`;
        case 'GTQ':
            return `Q ${amount.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        case 'EUR':
        default:
            return `${amount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
    }
} 