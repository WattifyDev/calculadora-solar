import Redis from 'ioredis';
import { LRUCache } from 'lru-cache';

// TTL por defecto: 2 horas (en segundos)
const CACHE_TTL_SECONDS = 7200;

// Caché en memoria como fallback automático si Redis no está disponible o falla
const localMemoryCache = new LRUCache<string, string>({
    max: 1000,
    ttl: CACHE_TTL_SECONDS * 1000, // milisegundos
});

let redisClient: Redis | null = null;
let isRedisAvailable = false;

// Inicialización de Redis bajo demanda
function getRedisClient(): Redis | null {
    if (redisClient) return redisClient;

    const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

    try {
        redisClient = new Redis(redisUrl, {
            maxRetriesPerRequest: 1,
            connectTimeout: 2000,
            lazyConnect: true,
            retryStrategy: (times) => {
                if (times > 3) {
                    isRedisAvailable = false;
                    return null; // Detener reintentos agresivos
                }
                return Math.min(times * 200, 1000);
            },
        });

        redisClient.on('connect', () => {
            isRedisAvailable = true;
            console.log('[CACHE] Conectado exitosamente a Redis');
        });

        redisClient.on('error', (err) => {
            isRedisAvailable = false;
            // No inundar logs con errores de conexión continua
        });

        // Intentar conectar en segundo plano
        redisClient.connect().then(() => {
            isRedisAvailable = true;
        }).catch(() => {
            isRedisAvailable = false;
        });

        return redisClient;
    } catch {
        isRedisAvailable = false;
        return null;
    }
}

function getCacheKey(identifier: string): string {
    return `contact_context:${identifier.toLowerCase().trim()}`;
}

/**
 * Obtiene el contexto en caché de un contacto (por email o teléfono)
 */
export async function getCachedContactContext(identifier: string): Promise<{ data: any; source: 'redis' | 'memory' } | null> {
    const key = getCacheKey(identifier);

    // 1. Intentar leer de Redis si está disponible
    const client = getRedisClient();
    if (client && isRedisAvailable) {
        try {
            const raw = await client.get(key);
            if (raw) {
                return { data: JSON.parse(raw), source: 'redis' };
            }
        } catch {
            // Fallback silencioso a memoria
        }
    }

    // 2. Fallback: LRU Cache en memoria
    const memData = localMemoryCache.get(key);
    if (memData) {
        try {
            return { data: JSON.parse(memData), source: 'memory' };
        } catch {
            return null;
        }
    }

    return null;
}

/**
 * Guarda el contexto del contacto en caché
 */
export async function setCachedContactContext(
    identifier: string,
    data: any,
    ttlSeconds: number = CACHE_TTL_SECONDS
): Promise<void> {
    const key = getCacheKey(identifier);
    const serialized = JSON.stringify(data);

    // Guardar siempre en memoria local
    localMemoryCache.set(key, serialized);

    // Guardar en Redis si está disponible
    const client = getRedisClient();
    if (client && isRedisAvailable) {
        try {
            await client.setex(key, ttlSeconds, serialized);
        } catch {
            // Ignorar error de Redis, ya está en memoria local
        }
    }
}

/**
 * Invalida la caché del contacto cuando hay una nueva sumisión, reunión o formulario
 */
export async function invalidateContactCache(identifiers: (string | null | undefined)[]): Promise<void> {
    const validKeys = identifiers
        .filter((id): id is string => Boolean(id && id.trim()))
        .map(getCacheKey);

    for (const key of validKeys) {
        localMemoryCache.delete(key);
    }

    const client = getRedisClient();
    if (client && isRedisAvailable && validKeys.length > 0) {
        try {
            await client.del(...validKeys);
            console.log(`[CACHE] Invalidadas ${validKeys.length} claves en Redis`);
        } catch {
            // Fallback silencioso
        }
    }
}
